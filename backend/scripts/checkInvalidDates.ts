import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany();
  bookings.forEach((b) => {
    const d = new Date(b.date);
    if (isNaN(d.getTime())) {
      console.log(`❌ Invalid date in booking ${b.id}:`, b.date);
    }
  });
}

main().finally(() => prisma.$disconnect()); 