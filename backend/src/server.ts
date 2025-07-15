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

// Save a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = await saveBooking(req.body);
    // Immediately push to MongoDB
    try {
      const client = await connectMongo();
      const collection = client.db('offlineBooking').collection('bookings');
      const existing = await collection.findOne({ id: booking.id });
      if (!existing) {
        await collection.insertOne({ ...booking, syncedAt: new Date() });
        console.log('Synced to MongoDB ✅');
      } else {
        console.log('Already synced to MongoDB ❌ Skipped duplicate.');
      }
    } catch (err) {
      console.error('MongoDB Sync Failed ❌', err);
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
    const collection = db.collection('bookings');
    const inserted = await collection.insertMany(
      localBookings.map((b: any) => ({
        ...b,
        syncedAt: new Date(),
      }))
    );
    res.json({
      message: 'Bookings synced to MongoDB',
      insertedCount: inserted.insertedCount,
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