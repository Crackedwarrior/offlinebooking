import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBmsData() {
  try {
    console.log('🔄 Migrating BMS data from Seat table to BmsBooking table...\n');

    // Get all BMS seats from Seat table
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

    console.log(`📊 Found ${bmsSeats.length} BMS seats to migrate`);

    if (bmsSeats.length === 0) {
      console.log('✅ No BMS seats to migrate');
      return;
    }

    // Determine which show these seats belong to based on seat ID patterns
    const showMapping: Record<string, string[]> = {
      'EVENING': ['BOX', 'SC', 'CB', 'FC', 'SC2'], // BOX, STAR CLASS, CLASSIC, FIRST CLASS, SECOND CLASS
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let migratedCount = 0;

    for (const seat of bmsSeats) {
      // Determine show based on seat ID pattern
      let show = 'EVENING'; // Default to EVENING
      
      for (const [showName, patterns] of Object.entries(showMapping)) {
        if (patterns.some(pattern => seat.seatId.startsWith(pattern))) {
          show = showName;
          break;
        }
      }

      // Create BMS booking record
      try {
        await prisma.bmsBooking.create({
          data: {
            seatId: seat.seatId,
            date: today,
            show: show as any,
            classLabel: seat.classLabel,
            status: 'BMS_BOOKED'
          }
        });
        migratedCount++;
        console.log(`✅ Migrated seat ${seat.seatId} to ${show} show`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ Seat ${seat.seatId} already exists in BmsBooking table`);
        } else {
          console.error(`❌ Failed to migrate seat ${seat.seatId}:`, error);
        }
      }
    }

    console.log(`\n🎉 Migration complete! Migrated ${migratedCount} seats`);

    // Verify migration
    const totalBmsBookings = await prisma.bmsBooking.count();
    console.log(`📊 Total BMS bookings in new table: ${totalBmsBookings}`);

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
    console.error('❌ Error migrating BMS data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateBmsData(); 