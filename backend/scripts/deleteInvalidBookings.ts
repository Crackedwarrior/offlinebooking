import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.booking.deleteMany({
    where: {
      OR: [
        { date: null },
        { date: { equals: "" } }
      ]
    }
  });
  console.log(`🗑️ Deleted ${result.count} bookings with invalid dates.`);
}

main().finally(() => prisma.$disconnect()); 