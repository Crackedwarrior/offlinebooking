/*
  Warnings:

  - You are about to drop the `ShowConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "printedAt" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ShowConfig";
PRAGMA foreign_keys=on;
