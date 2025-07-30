import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateSeats() {
  try {
    console.log('🔍 Checking for duplicate seat bookings...\n');
    
    // Get all bookings for July 30, 2025
    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: new Date('2025-07-30T00:00:00.000Z'),
          lt: new Date('2025-07-31T00:00:00.000Z')
        }
      },
      select: {
        id: true,
        show: true,
        bookedSeats: true,
        date: true
      }
    });

    console.log(`📊 Total bookings found: ${bookings.length}\n`);

    // Check EVENING show specifically
    const eveningBookings = bookings.filter(b => b.show === 'EVENING');
    console.log(`📊 EVENING show bookings: ${eveningBookings.length}\n`);

    // Collect all seat IDs
    const allSeatIds: string[] = [];
    eveningBookings.forEach(booking => {
      if (booking.bookedSeats) {
        allSeatIds.push(...booking.bookedSeats);
      }
    });

    console.log(`📊 Total seat IDs from EVENING bookings: ${allSeatIds.length}`);
    console.log(`📊 Unique seat IDs: ${new Set(allSeatIds).size}\n`);

    // Find duplicates
    const seatCounts: Record<string, number> = {};
    allSeatIds.forEach(seatId => {
      seatCounts[seatId] = (seatCounts[seatId] || 0) + 1;
    });

    const duplicates = Object.entries(seatCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('🚨 Duplicate seats found:');
      duplicates.forEach(([seatId, count]) => {
        console.log(`  - ${seatId}: booked ${count} times`);
      });
    } else {
      console.log('✅ No duplicate seats found');
    }

    console.log('\n📋 Sample bookings:');
    eveningBookings.slice(0, 3).forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Seats: ${booking.bookedSeats?.join(', ')}`);
      console.log(`   Date: ${booking.date}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateSeats(); 