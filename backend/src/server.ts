// src/server.ts

import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.post('/api/bookings', async (req: Request, res: Response) => {
  try {
    const { tickets, total, totalTickets, timestamp, show, screen, movie, date } = req.body;

    if (!tickets || !timestamp || !show || !screen || !movie) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingData = {
      date: date ? new Date(date) : new Date(timestamp),
      show,
      screen,
      movie,
      bookedSeats: tickets.map((t: any) => t.id),
      class: tickets[0]?.classLabel || 'UNKNOWN',
      pricePerSeat: tickets[0]?.price || 0,
      totalPrice: total,
    };

    const newBooking = await prisma.booking.create({ data: bookingData });

    // (Optional) Add summary sync logic here if needed

    res.status(201).json(newBooking);
  } catch (error) {
    console.error('❌ Booking save failed:', error);
    res.status(500).json({ error: 'Booking save failed' });
  }
});

app.get('/api/bookings', async (_req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 