/**
 * Ticket Grouping Utilities
 * Handles seat grouping logic for ticket printing
 */

// Types for seat and ticket group
export interface Seat {
  id: string;
  row: string;
  number: number;
  classLabel: string;
  price: number;
}

export interface TicketGroup {
  classLabel: string;
  row: string;
  seats: number[];
  price: number;
  seatIds: string[];
}

/**
 * Get class label from seat ID
 */
export const getClassFromSeatId = (seatId: string): string | null => {
  const rowPrefix = seatId.split('-')[0];
  const classMapping: Record<string, string> = {
    'BOX': 'BOX',
    'SC': 'STAR CLASS',
    'CB': 'CLASSIC',
    'FC': 'FIRST CLASS',
    'SC2': 'SECOND CLASS'
  };
  
  if (classMapping[rowPrefix]) {
    return classMapping[rowPrefix];
  }
  
  for (const [prefix, classLabel] of Object.entries(classMapping)) {
    if (rowPrefix.startsWith(prefix)) {
      return classLabel;
    }
  }
  
  return null;
};

/**
 * Group seats by class and row, considering decoupled seats
 */
export function groupSeats(seats: Seat[], decoupledSeatIds: string[] = []): TicketGroup[] {
  // Step 1: collect per (class,row) while keeping seat objects
  const byClassRow: Record<string, { classLabel: string; row: string; seats: Array<{ number: number; id: string; price: number }> }> = {};
  const results: TicketGroup[] = [];

  seats.forEach(seat => {
    // Decoupled seats are always individual tickets
    if (decoupledSeatIds.includes(seat.id)) {
      results.push({
        classLabel: seat.classLabel,
        row: seat.row,
        seats: [seat.number],
        price: seat.price,
        seatIds: [seat.id],
      });
      return;
    }
    const key = `${seat.classLabel}|${seat.row}`;
    if (!byClassRow[key]) {
      byClassRow[key] = { classLabel: seat.classLabel, row: seat.row, seats: [] };
    }
    byClassRow[key].seats.push({ number: seat.number, id: seat.id, price: seat.price });
  });

  // Step 2: for each (class,row), split into contiguous sequences to form tickets
  Object.values(byClassRow).forEach(group => {
    const sorted = group.seats.sort((a, b) => a.number - b.number);
    let currentChunk: typeof sorted = [];

    const flushChunk = () => {
      if (currentChunk.length === 0) return;
      results.push({
        classLabel: group.classLabel,
        row: group.row,
        seats: currentChunk.map(s => s.number),
        price: currentChunk.reduce((sum, s) => sum + s.price, 0),
        seatIds: currentChunk.map(s => s.id),
      });
      currentChunk = [];
    };

    for (let i = 0; i < sorted.length; i++) {
      const seat = sorted[i];
      if (currentChunk.length === 0) {
        currentChunk.push(seat);
      } else {
        const prev = currentChunk[currentChunk.length - 1];
        if (seat.number === prev.number + 1) {
          // contiguous, keep extending
          currentChunk.push(seat);
        } else {
          // gap -> flush previous ticket, start a new one
          flushChunk();
          currentChunk.push(seat);
        }
      }
    }
    flushChunk();
  });

  return results;
}

/**
 * Format seat numbers as range format (e.g., "4 - 6" instead of "4,5,6")
 */
export function formatSeatNumbers(seats: number[]): string {
  if (seats.length === 1) return seats[0].toString();
  
  // Sort seats to ensure proper range detection
  const sortedSeats = [...seats].sort((a, b) => a - b);
  
  // Check if seats are continuous
  const isContinuous = sortedSeats.every((seat, index) => {
    if (index === 0) return true;
    return seat === sortedSeats[index - 1] + 1;
  });
  
  if (isContinuous) {
    // All seats are continuous - use range format
    return `${sortedSeats[0]} - ${sortedSeats[sortedSeats.length - 1]}`;
  } else {
    // Non-continuous seats - group into ranges
    let ranges: string[] = [];
    let start = sortedSeats[0], end = sortedSeats[0];
    
    for (let i = 1; i <= sortedSeats.length; i++) {
      if (i < sortedSeats.length && sortedSeats[i] === end + 1) {
        end = sortedSeats[i];
      } else {
        if (start === end) {
          ranges.push(`${start}`);
        } else {
          ranges.push(`${start} - ${end}`);
        }
        if (i < sortedSeats.length) {
          start = sortedSeats[i];
          end = sortedSeats[i];
        }
      }
    }
    return ranges.join(', ');
  }
}

