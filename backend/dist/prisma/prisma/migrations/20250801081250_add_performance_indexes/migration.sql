-- CreateIndex
CREATE INDEX "Booking_date_show_status_idx" ON "Booking"("date", "show", "status");

-- CreateIndex
CREATE INDEX "Booking_bookedAt_idx" ON "Booking"("bookedAt");

-- CreateIndex
CREATE INDEX "Seat_status_idx" ON "Seat"("status");

-- CreateIndex
CREATE INDEX "Seat_classLabel_status_idx" ON "Seat"("classLabel", "status");

-- CreateIndex
CREATE INDEX "Seat_updatedAt_idx" ON "Seat"("updatedAt");
