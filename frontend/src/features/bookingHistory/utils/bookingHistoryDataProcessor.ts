/**
 * Data processing functions for BookingHistory component
 * Extracted from BookingHistory.tsx
 */

import { ShowTime } from '@/store/bookingStore';
import { seatSegments } from '@/features/seatGrid/components/SeatGrid';
import { SEAT_CLASSES } from '@/lib/config';
import { getClassFromSeatId } from './bookingHistoryHelpers';
import type { 
  ShowStats, 
  IncomeBreakdown, 
  QuickSummary, 
  IncomePercentages,
  ClassCountRow,
  ClassSeatSets,
  ShowInfo
} from '@/types/bookingHistory';

const TOTAL_SEATS = 590; // Total seats in theater

const classLabelMap: Record<string, string> = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.label;
  return acc;
}, {} as Record<string, string>);

/**
 * Builds seat sets by class for a given show and date
 */
export const buildSeatSetsForShow = (
  showKey: ShowTime,
  dateISO: string,
  seatStatusData: Record<string, any>,
  databaseBookings: any[]
): ClassSeatSets => {
  const classSeatSets: ClassSeatSets = {};

  const ensureClassEntry = (classLabel: string) => {
    if (!classSeatSets[classLabel]) {
      classSeatSets[classLabel] = {
        regular: new Set<string>(),
        bms: new Set<string>()
      };
    }
    return classSeatSets[classLabel];
  };

  const addSeat = (seatId: string | undefined, classLabel: string | undefined | null, type: 'regular' | 'bms') => {
    if (!seatId) return;
    const resolvedClass = classLabel || getClassFromSeatId(seatId);
    if (!resolvedClass) return;
    const targetSets = ensureClassEntry(resolvedClass);
    const uniqueKey = `${showKey}-${seatId}`;
    if (type === 'regular') {
      targetSets.regular.add(uniqueKey);
    } else {
      targetSets.bms.add(uniqueKey);
    }
  };

  const showSeatStatus = seatStatusData[showKey];
  if (showSeatStatus) {
    (showSeatStatus.bookedSeats || []).forEach((seat: any) => {
      const seatId = typeof seat === 'string' ? seat : seat?.seatId;
      const classLabel = typeof seat === 'string' ? undefined : seat?.class || seat?.classLabel;
      addSeat(seatId, classLabel, 'regular');
    });

    (showSeatStatus.bmsSeats || []).forEach((seat: any) => {
      const seatId = typeof seat === 'string' ? seat : seat?.seatId;
      const classLabel = typeof seat === 'string' ? undefined : seat?.class || seat?.classLabel;
      addSeat(seatId, classLabel, 'bms');
    });
  }

  (databaseBookings || []).forEach(b => {
    const dbDate = new Date(b.date).toISOString().split('T')[0];
    if (dbDate !== dateISO || b.show !== showKey || !Array.isArray(b.bookedSeats)) return;

    const isBMS = b.source === 'BMS' || b.source === 'bms';
    b.bookedSeats.forEach(seatEntry => {
      const seatId = typeof seatEntry === 'string' ? seatEntry : seatEntry?.seatId;
      // Derive class per seatId to prevent misclassification (no defaulting to STAR CLASS)
      const derivedClass = seatId ? getClassFromSeatId(seatId) : null;
      const classLabel = typeof seatEntry === 'string'
        ? (derivedClass || b.classLabel)
        : (seatEntry?.class || seatEntry?.classLabel || derivedClass || b.classLabel);
      addSeat(seatId, classLabel, isBMS ? 'bms' : 'regular');
    });
  });

  return classSeatSets;
};

/**
 * Calculates stats for all shows
 */
export const calculateAllStats = (
  selectedDate: string,
  databaseBookings: any[],
  seatStatusData: Record<string, any>,
  showOrder: ShowInfo[]
): Record<ShowTime, ShowStats> => {
  const dateObj = new Date(selectedDate);
  const dateISO = dateObj.toISOString().split('T')[0];
  
  const stats: Record<ShowTime, ShowStats> = {} as Record<ShowTime, ShowStats>;
  
  showOrder.forEach(show => {
    const localSeatIds = new Set<string>();
    const bmsSeatIds = new Set<string>();

    const showBookings = (databaseBookings || []).filter(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      return dbDate === dateISO && b.show === show.key;
    });
    
    showBookings.forEach(b => {
      if (!Array.isArray(b.bookedSeats)) return;
      const isBmsBooking = b.source === 'BMS' || b.source === 'bms';
      b.bookedSeats.forEach(seatId => {
        const key = `${show.key}-${seatId}`;
        if (isBmsBooking) {
          bmsSeatIds.add(key);
        } else {
          localSeatIds.add(key);
        }
      });
    });

    const showSeatStatus = seatStatusData[show.key];
    if (showSeatStatus) {
      (showSeatStatus.bookedSeats || []).forEach((seat: any) => {
        const seatId = typeof seat === 'string' ? seat : seat?.seatId;
        if (!seatId) return;
        localSeatIds.add(`${show.key}-${seatId}`);
      });

      (showSeatStatus.bmsSeats || []).forEach((seat: any) => {
        const seatId = typeof seat === 'string' ? seat : seat?.seatId;
        if (!seatId) return;
        bmsSeatIds.add(`${show.key}-${seatId}`);
      });
    }

    const total = TOTAL_SEATS;
    const booked = localSeatIds.size;
    const bms = bmsSeatIds.size;
    const available = total - booked - bms;
    const blocked = 0; // No blocked seats yet
    const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
    
    stats[show.key] = { total, available, booked, bms, blocked, occupancy };
  });
  
  return stats;
};

/**
 * Calculates class counts for a given date and show filter
 * Exported for use in PDF generation
 */
export const calculateClassCounts = (
  dateISO: string,
  showFilter: ShowTime | null,
  showOrder: ShowInfo[],
  seatStatusData: Record<string, any>,
  databaseBookings: any[]
): Record<string, { regular: number; bms: number }> => {
  const aggregateSets: Record<string, { regular: Set<string>; bms: Set<string> }> = {};

  const mergeClassSets = (classSets: ClassSeatSets) => {
    Object.entries(classSets).forEach(([classLabel, seatSets]) => {
      if (!aggregateSets[classLabel]) {
        aggregateSets[classLabel] = { regular: new Set<string>(), bms: new Set<string>() };
      }
      seatSets.regular.forEach(id => aggregateSets[classLabel].regular.add(id));
      seatSets.bms.forEach(id => aggregateSets[classLabel].bms.add(id));
    });
  };

  if (showFilter) {
    mergeClassSets(buildSeatSetsForShow(showFilter, dateISO, seatStatusData, databaseBookings));
  } else {
    showOrder.forEach(show => {
      mergeClassSets(buildSeatSetsForShow(show.key, dateISO, seatStatusData, databaseBookings));
    });
  }

  if (Object.keys(aggregateSets).length === 0) {
    // No API data yet: avoid using local in-memory seats which may belong to a different date/show.
    // Return zeros per class and let UI update when fresh data arrives.
    return seatSegments.reduce<Record<string, { regular: number; bms: number }>>((acc, seg) => {
      acc[seg.label] = { regular: 0, bms: 0 };
      return acc;
    }, {});
  }

  return Object.entries(aggregateSets).reduce<Record<string, { regular: number; bms: number }>>((acc, [classLabel, seatSets]) => {
    acc[classLabel] = {
      regular: seatSets.regular.size,
      bms: seatSets.bms.size
    };
    return acc;
  }, {});
};

/**
 * Calculates income breakdown for the selected date and show
 */
export const calculateIncomeBreakdown = (
  selectedDate: string,
  selectedShow: ShowTime | null,
  databaseBookings: any[],
  seatStatusData: Record<string, any>,
  getPriceForClass: (classLabel: string) => number,
  currentPricing: Record<string, number>
): IncomeBreakdown => {
  const dateISO = selectedDate;
  
  let onlineIncome = 0;
  let bmsIncome = 0;
  
  // Calculate income from database bookings
  (databaseBookings || []).forEach(b => {
    const dbDate = new Date(b.date).toISOString().split('T')[0];
    const showMatches = selectedShow ? b.show === selectedShow : true; // Show all if no show selected
    if (dbDate === dateISO && showMatches) {
      // All bookings from database are currently marked as LOCAL source
      // since we're not setting the source correctly in the backend
      // For now, we'll consider all database bookings as online income
      onlineIncome += (b.totalPrice || 0);
    }
  });
  
  // Calculate additional BMS income from seat status data
  if (selectedShow) {
    // For specific show, get BMS seats from that show's seat status
    const showSeatStatus = seatStatusData[selectedShow];
    if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
      showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
        const seatId = bmsSeat.seatId;
        // Use the class from the BMS seat data if available, otherwise determine from seat ID
        const classLabel = bmsSeat.class || getClassFromSeatId(seatId);
        
        if (classLabel) {
          // Use dynamic pricing from settings store (same as regular seats)
          // Get price directly from the store to ensure we have the latest value
          const price = currentPricing[classLabel] || getPriceForClass(classLabel);
          bmsIncome += price;
        }
      });
    }
  } else {
    // For all shows, aggregate BMS income from all shows
    Object.entries(seatStatusData).forEach(([showKey, showSeatStatus]) => {
      if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
        showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
          const seatId = bmsSeat.seatId;
          // Use the class from the BMS seat data if available, otherwise determine from seat ID
          const classLabel = bmsSeat.class || getClassFromSeatId(seatId);
          
          if (classLabel) {
            // Use dynamic pricing from settings store (same as regular seats)
            // Get price directly from the store to ensure we have the latest value
            const price = currentPricing[classLabel] || getPriceForClass(classLabel);
            bmsIncome += price;
          }
        });
      }
    });
  }

  return {
    online: onlineIncome,
    bms: bmsIncome,
    total: onlineIncome + bmsIncome
  };
};

/**
 * Calculates class counts data for display
 */
export const calculateClassCountsData = (
  selectedShow: ShowTime | null,
  selectedDate: string,
  showOrder: ShowInfo[],
  seatStatusData: Record<string, any>,
  databaseBookings: any[]
): ClassCountRow[] => {
  const classCounts = calculateClassCounts(
    selectedDate,
    selectedShow,
    showOrder,
    seatStatusData,
    databaseBookings
  );

  if (selectedShow) {
    // For a specific show, return counts for that show only
    return seatSegments.map(seg => {
      const counts = classCounts[seg.label] || { regular: 0, bms: 0 };
      return {
        label: classLabelMap[seg.label] || seg.label,
        regular: counts.regular,
        bms: counts.bms,
        total: counts.regular + counts.bms
      };
    });
  }

  // For all shows, aggregate counts
  const aggregated = showOrder.reduce<Record<string, { regular: number; bms: number }>>((acc, show) => {
    const perShowCounts = calculateClassCounts(
      selectedDate,
      show.key,
      showOrder,
      seatStatusData,
      databaseBookings
    );
    Object.entries(perShowCounts).forEach(([classLabel, counts]) => {
      if (!acc[classLabel]) {
        acc[classLabel] = { regular: 0, bms: 0 };
      }
      acc[classLabel].regular += counts.regular;
      acc[classLabel].bms += counts.bms;
    });
    return acc;
  }, {});

  return seatSegments.map(seg => {
    const counts = aggregated[seg.label] || { regular: 0, bms: 0 };
    return {
      label: classLabelMap[seg.label] || seg.label,
      regular: counts.regular,
      bms: counts.bms,
      total: counts.regular + counts.bms
    };
  });
};

/**
 * Calculates quick summary data
 */
export const calculateQuickSummary = (classCountsData: ClassCountRow[]): QuickSummary => {
  const totalBookingSeats = classCountsData.reduce((sum, r) => sum + r.regular, 0);
  const totalOnlineSeats = classCountsData.reduce((sum, r) => sum + r.bms, 0);
  const totalSeats = classCountsData.reduce((sum, r) => sum + r.total, 0);
  
  return {
    totalBookingSeats,
    totalOnlineSeats,
    totalSeats
  };
};

/**
 * Calculates income percentages
 */
export const calculateIncomePercentages = (incomeBreakdown: IncomeBreakdown): IncomePercentages => {
  const onlinePercentage = incomeBreakdown.total > 0 
    ? Math.round((incomeBreakdown.online / incomeBreakdown.total) * 100) 
    : 0;
  const bmsPercentage = incomeBreakdown.total > 0 
    ? Math.round((incomeBreakdown.bms / incomeBreakdown.total) * 100) 
    : 0;
  
  return {
    onlinePercentage,
    bmsPercentage
  };
};

