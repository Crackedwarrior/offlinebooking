import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookings() {
  try {
    console.log('🔍 Checking database for bookings...');
    
    const totalBookings = await prisma.booking.count();
    console.log(`📊 Total bookings in database: ${totalBookings}`);
    
    if (totalBookings > 0) {
      const bookings = await prisma.booking.findMany({
        take: 5,
        orderBy: { bookedAt: 'desc' }
      });
      
      console.log('\n📋 Recent bookings:');
      bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Date: ${booking.date}`);
        console.log(`   Show: ${booking.show}`);
        console.log(`   Class: ${booking.classLabel}`);
        console.log(`   Seats: ${booking.seatCount}`);
        console.log(`   Booked Seats: ${JSON.stringify(booking.bookedSeats)}`);
        console.log(`   Total Price: ${booking.totalPrice}`);
      });
    } else {
      console.log('❌ No bookings found in database');
    }
    
    // Check for specific date (July 30, 2025)
    const targetDate = new Date('2025-07-30');
    const dateBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
        }
      }
    });
    
    console.log(`\n📅 Bookings for July 30, 2025: ${dateBookings.length}`);
    if (dateBookings.length > 0) {
      dateBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.show} - ${booking.classLabel} - ${booking.seatCount} seats`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings(); 