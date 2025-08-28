-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "show" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "movie" TEXT NOT NULL,
    "movieLanguage" TEXT NOT NULL DEFAULT 'HINDI',
    "bookedSeats" JSONB NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "classLabel" TEXT NOT NULL,
    "pricePerSeat" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "source" TEXT NOT NULL DEFAULT 'LOCAL',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bookedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "notes" TEXT,
    "totalIncome" INTEGER DEFAULT 0,
    "localIncome" INTEGER DEFAULT 0,
    "bmsIncome" INTEGER DEFAULT 0,
    "vipIncome" INTEGER DEFAULT 0
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "classLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "bookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'HINDI',
    "screen" TEXT NOT NULL DEFAULT 'Screen 1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShowConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "show" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classLabel" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Booking_date_show_idx" ON "Booking"("date", "show");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_source_idx" ON "Booking"("source");

-- CreateIndex
CREATE INDEX "Booking_classLabel_idx" ON "Booking"("classLabel");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_seatId_key" ON "Seat"("seatId");

-- CreateIndex
CREATE INDEX "Seat_seatId_idx" ON "Seat"("seatId");

-- CreateIndex
CREATE INDEX "Seat_row_number_idx" ON "Seat"("row", "number");

-- CreateIndex
CREATE INDEX "Seat_classLabel_idx" ON "Seat"("classLabel");

-- CreateIndex
CREATE INDEX "Seat_bookingId_idx" ON "Seat"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_name_key" ON "Movie"("name");

-- CreateIndex
CREATE INDEX "Movie_name_idx" ON "Movie"("name");

-- CreateIndex
CREATE INDEX "Movie_isActive_idx" ON "Movie"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShowConfig_show_key" ON "ShowConfig"("show");

-- CreateIndex
CREATE INDEX "ShowConfig_show_idx" ON "ShowConfig"("show");

-- CreateIndex
CREATE INDEX "ShowConfig_isActive_idx" ON "ShowConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_classLabel_key" ON "PricingConfig"("classLabel");

-- CreateIndex
CREATE INDEX "PricingConfig_classLabel_idx" ON "PricingConfig"("classLabel");

-- CreateIndex
CREATE INDEX "PricingConfig_isActive_idx" ON "PricingConfig"("isActive");
