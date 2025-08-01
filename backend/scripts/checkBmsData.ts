import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBmsData() {
  try {
    console.log('🔍 Checking BMS data in database...\n');

    // Check Seat table for BMS_BOOKED seats
    const bmsSeats = await prisma.seat.findMany({
      where: {
        status: 'BMS_BOOKED'
      },
      select: {
        seatId: true,
        classLabel: true,
        createdAt: true
      }
    });

    console.log(`📊 BMS seats in Seat table: ${bmsSeats.length}`);
    console.log('Sample BMS seats:', bmsSeats.slice(0, 5));
    console.log('');

    // Check BmsBooking table
    const bmsBookings = await prisma.bmsBooking.findMany({
      select: {
        seatId: true,
        date: true,
        show: true,
        classLabel: true,
        createdAt: true
      }
    });

    console.log(`📊 BMS bookings in BmsBooking table: ${bmsBookings.length}`);
    console.log('Sample BMS bookings:', bmsBookings.slice(0, 5));
    console.log('');

    // Check by show
    const shows = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'] as const;
    for (const show of shows) {
      const showBmsBookings = await prisma.bmsBooking.findMany({
        where: {
          show: show
        }
      });
      console.log(`${show} show BMS bookings: ${showBmsBookings.length}`);
    }

  } catch (error) {
    console.error('❌ Error checking BMS data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBmsData(); 