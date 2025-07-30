import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRemainingBookings() {
  try {
    console.log('🔍 Checking for remaining bookings in database...\n');
    
    const totalBookings = await prisma.booking.count();
    console.log(`📊 Total bookings in database: ${totalBookings}\n`);
    
    if (totalBookings > 0) {
      console.log('⚠️ Found remaining bookings:');
      
      const bookings = await prisma.booking.findMany({
        select: {
          id: true,
          date: true,
          show: true,
          movie: true,
          bookedSeats: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      bookings.forEach((booking, index) => {
        console.log(`${index + 1}. ID: ${booking.id}`);
        console.log(`   Date: ${booking.date.toISOString().split('T')[0]}`);
        console.log(`   Show: ${booking.show}`);
        console.log(`   Movie: "${booking.movie}"`);
        console.log(`   Seats: ${(booking.bookedSeats as string[]).join(', ')}`);
        console.log(`   Created: ${booking.createdAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('✅ No bookings found in database - all deleted successfully!');
    }
    
    // Check seat status for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🔍 Checking seat status for today (${today}):`);
    
    const todayBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lt: new Date(today + 'T23:59:59.999Z')
        }
      },
      select: {
        show: true,
        bookedSeats: true
      }
    });
    
    const bookedSeatsByShow = todayBookings.reduce((acc, booking) => {
      const show = booking.show;
      if (!acc[show]) acc[show] = [];
      acc[show].push(...(booking.bookedSeats as string[]));
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(bookedSeatsByShow).forEach(([show, seats]) => {
      console.log(`   ${show}: ${seats.length} booked seats (${seats.join(', ')})`);
    });
    
    if (Object.keys(bookedSeatsByShow).length === 0) {
      console.log('   No bookings found for today');
    }
    
  } catch (error) {
    console.error('❌ Error checking remaining bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRemainingBookings(); 