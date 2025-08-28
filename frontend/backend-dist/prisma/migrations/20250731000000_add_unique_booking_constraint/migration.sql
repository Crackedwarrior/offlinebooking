-- CreateTable
-- This migration adds a unique constraint to prevent duplicate bookings for the same seats on the same date and show

-- Add unique constraint to prevent duplicate bookings
CREATE UNIQUE INDEX "Booking_date_show_bookedSeats_key" ON "Booking"("date", "show", "bookedSeats"); 