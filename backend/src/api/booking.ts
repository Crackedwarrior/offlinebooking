import prisma from '@/db/prismaClient';

// Save a booking snapshot
export async function saveBooking(bookingData) {
  return await prisma.booking.create({
    data: bookingData,
  });
}

// Get all past bookings (for Booking History)
export async function getAllBookings() {
  return await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

// Get a single booking by ID (for 'View' button)
export async function getBookingById(id: string) {
  return await prisma.booking.findUnique({
    where: { id },
  });
} 