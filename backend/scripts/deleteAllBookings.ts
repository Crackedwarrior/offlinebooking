import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllBookings() {
  try {
    console.log('🗑️ Deleting all bookings from database...\n');
    
    const totalBookings = await prisma.booking.count();
    console.log(`📊 Total bookings to delete: ${totalBookings}\n`);
    
    if (totalBookings === 0) {
      console.log('✅ No bookings to delete - database is already empty!');
      return;
    }
    
    // Delete all bookings
    const result = await prisma.booking.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} bookings!`);
    console.log('🎉 Database is now clean - all seats should be available.');
    
    // Verify deletion
    const remainingBookings = await prisma.booking.count();
    console.log(`\n🔍 Verification: ${remainingBookings} bookings remaining`);
    
    if (remainingBookings === 0) {
      console.log('✅ All bookings deleted successfully!');
    } else {
      console.log('⚠️ Some bookings still remain - deletion may have failed.');
    }
    
  } catch (error) {
    console.error('❌ Error deleting bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllBookings(); 