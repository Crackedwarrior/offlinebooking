import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMovieNames() {
  try {
    console.log('🔍 Checking movie names in database...\n');
    
    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        date: true,
        show: true,
        movie: true,
        movieLanguage: true,
        customerName: true,
        bookedSeats: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`📊 Found ${bookings.length} recent bookings:\n`);
    
    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Date: ${booking.date.toISOString().split('T')[0]}`);
      console.log(`   Show: ${booking.show}`);
      console.log(`   Movie: "${booking.movie}"`);
      console.log(`   Language: ${booking.movieLanguage}`);
      console.log(`   Customer: ${booking.customerName || 'No Name'}`);
      console.log(`   Seats: ${(booking.bookedSeats as string[]).join(', ')}`);
      console.log(`   Created: ${booking.createdAt.toISOString()}`);
      console.log('');
    });
    
    // Check for specific movie names
    const movieCounts = await prisma.booking.groupBy({
      by: ['movie'],
      _count: {
        movie: true
      },
      orderBy: {
        _count: {
          movie: 'desc'
        }
      }
    });
    
    console.log('📈 Movie name distribution:');
    movieCounts.forEach(movie => {
      console.log(`   "${movie.movie}": ${movie._count.movie} bookings`);
    });
    
  } catch (error) {
    console.error('❌ Error checking movie names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMovieNames(); 