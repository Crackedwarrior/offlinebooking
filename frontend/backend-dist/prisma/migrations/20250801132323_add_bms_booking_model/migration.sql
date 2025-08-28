-- DropIndex
DROP INDEX "Booking_bookedAt_idx";

-- DropIndex
DROP INDEX "Booking_date_show_status_idx";

-- DropIndex
DROP INDEX "Seat_updatedAt_idx";

-- DropIndex
DROP INDEX "Seat_classLabel_status_idx";

-- DropIndex
DROP INDEX "Seat_status_idx";

-- CreateTable
CREATE TABLE "BmsBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "show" TEXT NOT NULL,
    "classLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BMS_BOOKED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BmsBooking_seatId_idx" ON "BmsBooking"("seatId");

-- CreateIndex
CREATE INDEX "BmsBooking_date_show_idx" ON "BmsBooking"("date", "show");

-- CreateIndex
CREATE INDEX "BmsBooking_classLabel_idx" ON "BmsBooking"("classLabel");

-- CreateIndex
CREATE INDEX "BmsBooking_status_idx" ON "BmsBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BmsBooking_seatId_date_show_key" ON "BmsBooking"("seatId", "date", "show");
