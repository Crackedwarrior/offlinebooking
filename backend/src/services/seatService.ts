import { PrismaClient } from '@prisma/client';
import { SeatStatusQueryParams, SeatStatusResponse } from '../types/api';
import { ValidationError } from '../utils/errors';

export class SeatService {
  private prisma: PrismaClient;
  private selectedSeatsStorage: Map<string, Set<string>>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.selectedSeatsStorage = new Map<string, Set<string>>();
  }

  /**
   * Helper function to get storage key for selected seats
   */
  private getStorageKey(date: string, show: string): string {
    return `${date}-${show}`;
  }

  /**
   * Helper to derive class label from seatId prefix
   */
  private deriveClassFromSeatId(seatId: string): string {
    if (seatId.startsWith('BOX')) return 'BOX';
    if (seatId.startsWith('SC2')) return 'SECOND CLASS';
    if (seatId.startsWith('SC')) return 'STAR CLASS';
    if (seatId.startsWith('CB')) return 'CLASSIC';
    if (seatId.startsWith('FC')) return 'FIRST CLASS';
    return 'STAR CLASS';
  }

  /**
   * Get seat status for a specific date and show
   */
  async getSeatStatus(queryParams: SeatStatusQueryParams): Promise<SeatStatusResponse> {
    const { date, show } = queryParams;
    
    if (!date || !show) {
      throw new ValidationError('Date and show are required');
    }
    
    // Build filter conditions with date range
    const where: any = {};
    
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    if (date) {
      where.date = {
        gte: startOfDay,
        lt: endOfDay
      };
    }
    if (show) where.show = show;
    
    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        bookedSeats: true,
        classLabel: true
      }
    });
    
    // Extract all booked seats with proper per-seat class
    const bookedSeats = bookings.flatMap((booking: any) => {
      const seats = Array.isArray(booking.bookedSeats) ? (booking.bookedSeats as string[]) : [];
      return seats.map((seatId: string) => ({
        seatId,
        class: this.deriveClassFromSeatId(seatId)
      }));
    });
    
    // Get BMS marked seats from the BmsBooking table for this specific date and show
    const bmsSeats = await this.prisma.bmsBooking.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay
        },
        show: show as any,
        status: 'BMS_BOOKED' // Ensure we only get BMS_BOOKED seats
      },
      select: {
        seatId: true,
        classLabel: true
      }
    });
    
    console.log('[DB] BMS seats found:', {
      date,
      show,
      count: bmsSeats.length,
      seats: bmsSeats.map((seat: any) => ({ id: seat.seatId, class: seat.classLabel }))
    });
    
    console.log('[DB] Seat status response:', {
      date,
      show,
      bookingsFound: bookings.length,
      totalBookedSeats: bookedSeats.length,
      bmsSeatsFound: bmsSeats.length,
      sampleBookedSeats: bookedSeats.slice(0, 5),
      sampleBmsSeats: bmsSeats.slice(0, 5)
    });
    
    // Get selected seats from in-memory storage
    const storageKey = this.getStorageKey(date, show);
    const selectedSeats = this.selectedSeatsStorage.get(storageKey) || new Set();
    const selectedSeatsArray = Array.from(selectedSeats).map((seatId: string) => ({
      seatId,
      class: 'SELECTED' // We don't store class info for selected seats, just mark as selected
    }));
    
    return {
      success: true,
      data: {
        date,
        show,
        bookedSeats,
        bmsSeats: bmsSeats.map((seat: any) => ({
          seatId: seat.seatId,
          class: seat.classLabel
        })),
        selectedSeats: selectedSeatsArray,
        totalBooked: bookedSeats.length,
        totalBms: bmsSeats.length,
        totalSelected: selectedSeatsArray.length
      }
    };
  }

  /**
   * Save BMS seat status
   */
  async saveBmsSeats(seatIds: string[], status: string, date: string, show: string): Promise<any> {
    if (!seatIds || !Array.isArray(seatIds)) {
      throw new ValidationError('seatIds array is required');
    }
    
    if (!status || !['BMS_BOOKED', 'AVAILABLE'].includes(status)) {
      throw new ValidationError('status must be BMS_BOOKED or AVAILABLE');
    }
    
    if (!date || !show) {
      throw new ValidationError('date and show are required');
    }
    
    console.log('[DB] Saving BMS seat status:', { seatIds, status, date, show });
    
    // Update or create BMS booking records
    const results = await Promise.all(
      seatIds.map(async (seatId: string) => {
        // Determine class label based on seat ID
        let classLabel = 'STAR CLASS'; // default
        if (seatId.startsWith('BOX')) classLabel = 'BOX';
        else if (seatId.startsWith('SC2')) classLabel = 'SECOND CLASS';
        else if (seatId.startsWith('SC')) classLabel = 'STAR CLASS';
        else if (seatId.startsWith('CB')) classLabel = 'CLASSIC';
        else if (seatId.startsWith('FC')) classLabel = 'FIRST CLASS';
        
        if (status === 'BMS_BOOKED') {
          // Create BMS booking record
          console.log(`Creating BMS booking for seat ${seatId} with class ${classLabel}`);
          return await this.prisma.bmsBooking.upsert({
            where: { 
              seatId_date_show: {
                seatId,
                date: new Date(date),
                show: show as any
              }
            },
            update: { 
              status: status as any,
              classLabel, // Ensure class label is updated
              updatedAt: new Date()
            },
            create: {
              seatId,
              date: new Date(date),
              show: show as any,
              classLabel,
              status: status as any
            }
          });
        } else {
          // Remove BMS booking record
          return await this.prisma.bmsBooking.deleteMany({
            where: {
              seatId,
              date: new Date(date),
              show: show as any
            }
          });
        }
      })
    );
    
    console.log(`[DB] Updated ${results.length} BMS bookings to status: ${status}`);
    
    return {
      success: true,
      message: `Updated ${results.length} BMS bookings to ${status}`,
      data: results
    };
  }

  /**
   * Update seat status (for move operations)
   */
  async updateSeatStatus(seatUpdates: Array<{seatId: string; status: string}>, date: string, show: string): Promise<any> {
    if (!seatUpdates || !Array.isArray(seatUpdates)) {
      throw new ValidationError('seatUpdates array is required');
    }
    
    if (!date || !show) {
      throw new ValidationError('date and show are required');
    }
    
    console.log('[DB] Updating seat status:', { seatUpdates, date, show });
    
    const storageKey = this.getStorageKey(date, show);
    if (!this.selectedSeatsStorage.has(storageKey)) {
      this.selectedSeatsStorage.set(storageKey, new Set());
    }
    const selectedSeats = this.selectedSeatsStorage.get(storageKey)!;
    
    // Process each seat update
    const results = await Promise.all(
      seatUpdates.map(async (update: { seatId: string; status: string }) => {
        const { seatId, status } = update;
        
        if (!['AVAILABLE', 'SELECTED', 'BOOKED', 'BLOCKED'].includes(status)) {
          throw new ValidationError(`Invalid status: ${status}`);
        }
        
        // Update in-memory storage
        if (status === 'SELECTED') {
          selectedSeats.add(seatId);
        } else {
          selectedSeats.delete(seatId);
        }
        
        console.log(`[DB] Seat ${seatId} status updated to ${status} for ${date} ${show}`);
        
        return { seatId, status, success: true };
      })
    );
    
    console.log(`[DB] Updated ${results.length} seat statuses. Current selected seats for ${storageKey}:`, Array.from(selectedSeats));
    
    return {
      success: true,
      message: `Updated ${results.length} seat statuses`,
      data: results
    };
  }
}
