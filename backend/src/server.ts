import express, { Request, Response } from 'express';
import cors from 'cors';
import { saveBooking, getAllBookings, getBookingById, updateBookingById } from './api/booking';
import { generateBookingPDF } from '../utils/pdfGenerator';
import { connectMongo } from '../utils/mongoClient';
import prisma from './db/prismaClient';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper: Map row to class label
const rowToClass = (row) => {
  if (row.startsWith('BOX')) return 'BOX';
  if (row.startsWith('SC-') || row.startsWith('SC_')) return 'STAR_CLASS';
  if (row.startsWith('CB-')) return 'CLASSIC';
  if (row.startsWith('FC-')) return 'FIRST_CLASS';
  if (row.startsWith('SC2-')) return 'SECOND_CLASS';
  return 'OTHER';
};

// Save a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = await saveBooking(req.body);
    // After saving locally, trigger summary sync for this show/date/screen
    try {
      const client = await connectMongo();
      const collection = client.db('offlineBooking').collection('show_summaries');
      // Find all bookings for this show/date/screen
      const group = await prisma.booking.findMany({
        where: {
          date: booking.date,
          show: booking.show,
          screen: booking.screen,
        },
      });
      // Aggregate summary
      const classWiseBreakdown = {};
      let totalSeats = 0;
      let totalIncome = 0;
      for (const b of group) {
        if (Array.isArray(b.bookedSeats)) {
          for (const seat of b.bookedSeats) {
            const classLabel = rowToClass(seat.row);
            if (!classWiseBreakdown[classLabel]) classWiseBreakdown[classLabel] = { count: 0, income: 0 };
            classWiseBreakdown[classLabel].count++;
            classWiseBreakdown[classLabel].income += seat.price || 0;
            totalSeats++;
          }
        }
        totalIncome += b.totalIncome || 0;
      }
      // Insert a new summary document (never overwrite)
      await collection.insertOne({
        date: booking.date,
        show: booking.show,
        screen: booking.screen,
        theatreName: booking.theatreName,
        totalIncome,
        totalSeats,
        classWiseBreakdown,
        syncedAt: new Date(),
      });
    } catch (err) {
      console.error('MongoDB Summary Sync Failed ❌', err);
    }
    res.json(booking);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    res.json(booking);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Update booking
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const updated = await updateBookingById(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.get('/api/bookings/:id/pdf', function (req: Request, res: Response) {
  (async () => {
    const bookingId = req.params.id;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      res.status(404).send('Booking not found');
      return;
    }
    const pdfBytes = await generateBookingPDF(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${bookingId}.pdf`);
    res.send(pdfBytes);
  })().catch((err) => {
    console.error('PDF generation failed:', err);
    res.status(500).send('Internal Server Error');
  });
});

// Add sync-to-mongo route
app.post('/api/sync-to-mongo', async (req, res) => {
  try {
    const localBookings = await prisma.booking.findMany();
    const client = await connectMongo();
    const db = client.db('offlineBooking');
    const collection = db.collection('show_summaries');

    // Group bookings by date, show, and screen
    const grouped = {};
    for (const b of localBookings) {
      const key = `${b.date.toISOString().split('T')[0]}|${b.show}|${b.screen}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(b);
    }

    let insertedCount = 0;
    for (const key in grouped) {
      const group = grouped[key];
      const first = group[0];
      // Aggregate summary
      const classWiseBreakdown = {};
      let totalSeats = 0;
      let totalIncome = 0;
      for (const b of group) {
        if (Array.isArray(b.bookedSeats)) {
          for (const seat of b.bookedSeats) {
            const classLabel = rowToClass(seat.row);
            if (!classWiseBreakdown[classLabel]) classWiseBreakdown[classLabel] = { count: 0, income: 0 };
            classWiseBreakdown[classLabel].count++;
            classWiseBreakdown[classLabel].income += seat.price || 0;
            totalSeats++;
          }
        }
        totalIncome += b.totalIncome || 0;
      }
      // Always insert a new summary document (never overwrite)
      await collection.insertOne({
        date: first.date,
        show: first.show,
        screen: first.screen,
        theatreName: first.theatreName,
        totalIncome,
        totalSeats,
        classWiseBreakdown,
        syncedAt: new Date(),
      });
      insertedCount++;
    }

    res.json({
      message: 'Show summaries synced to MongoDB',
      insertedCount,
    });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Failed to sync to MongoDB' });
  }
});

// Reports summary route
app.get('/api/reports/summary', async (req, res) => {
  try {
    const data = await prisma.booking.findMany();
    const summary = {
      totalIncome: 0,
      localIncome: 0,
      bmsIncome: 0,
      vipIncome: 0,
    };
    for (const b of data) {
      summary.totalIncome += b.totalIncome || 0;
      summary.localIncome += b.localIncome || 0;
      summary.bmsIncome += b.bmsIncome || 0;
      summary.vipIncome += b.vipIncome || 0;
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
}); 