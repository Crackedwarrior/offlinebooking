import { seatsByRow } from '@/lib/seatMatrix';
import { hasAisles, findCenterGapPosition, isStrictlyContiguous, getBaseRowForClass } from '@/utils/seatUtils';

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: string;
}

export const getRowCenter = (row: string): number => {
  const layout = seatsByRow[row] || [];
  const gap = findCenterGapPosition(row);
  if (gap !== -1) return gap;
  const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
  if (nums.length === 0) return 0;
  return (nums[0] + nums[nums.length - 1]) / 2;
};

export const startCarrotAtCenter = (row: string, count: number, availableSeats: Seat[]): Seat[] | null => {
  if (availableSeats.length < count) return null;
  
  const rowCenter = getRowCenter(row);
  const sortedSeats = availableSeats.sort((a, b) => a.number - b.number);
  
  let bestBlock: Seat[] | null = null;
  let bestDistance = Infinity;
  
  for (let i = 0; i <= sortedSeats.length - count; i++) {
    const block = sortedSeats.slice(i, i + count);
    
    const isContiguous = isStrictlyContiguous(row, block);
    if (!isContiguous) continue;
    
    const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
    const distance = Math.abs(blockCenter - rowCenter);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestBlock = block;
    }
  }
  
  return bestBlock;
};

const findSingleAdjacentSeat = (row: string, availableSeats: Seat[], bookedSeats: Seat[]): Seat | null => {
  const rowCenter = getRowCenter(row);
  const sortedBooked = bookedSeats.sort((a, b) => a.number - b.number);
  const sortedAvailable = availableSeats.sort((a, b) => a.number - b.number);
  
  // 🚨 FIXED: Check ALL booked seats for adjacent available seats, not just min/max
  let bestAdjacentSeat: Seat | null = null;
  let bestDistance = Infinity;
  
  for (const bookedSeat of sortedBooked) {
    // Check left adjacent
    const leftAdjacent = sortedAvailable.find(seat => seat.number === bookedSeat.number - 1);
    if (leftAdjacent) {
      const distance = Math.abs(leftAdjacent.number - rowCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAdjacentSeat = leftAdjacent;
      }
    }
    
    // Check right adjacent
    const rightAdjacent = sortedAvailable.find(seat => seat.number === bookedSeat.number + 1);
    if (rightAdjacent) {
      const distance = Math.abs(rightAdjacent.number - rowCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAdjacentSeat = rightAdjacent;
      }
    }
  }
  
  return bestAdjacentSeat;
};

const growFromAdjacentSeat = (adjacentSeat: Seat, count: number, availableSeats: Seat[]): Seat[] | null => {
  const row = adjacentSeat.row;
  const rowCenter = getRowCenter(row);
  const sortedAvailable = availableSeats.sort((a, b) => a.number - b.number);
  
  // 🚨 FIXED: Changed > to < - if seat is to the LEFT of center, grow LEFT
  const shouldGrowLeft = adjacentSeat.number < rowCenter;
  
  let result = [adjacentSeat];
  
  for (let i = 1; i < count; i++) {
    const nextNumber = shouldGrowLeft ? adjacentSeat.number - i : adjacentSeat.number + i;
    const nextSeat = sortedAvailable.find(s => s.number === nextNumber);
    
    if (nextSeat) {
      if (shouldGrowLeft) {
        result.unshift(nextSeat);
      } else {
        result.push(nextSeat);
      }
    } else {
      break;
    }
  }
  
  if (result.length === count && isStrictlyContiguous(row, result)) {
    return result;
  }
  
  return null;
};

/**
 * Find seats adjacent to booked seats, prefer center side, avoid orphans
 */
export const findAdjacentToBooked = (row: string, count: number, availableSeats: Seat[], bookedSeats: Seat[]): Seat[] | null => {
  console.log(`🔍 findAdjacentToBookedUtil called: row=${row}, count=${count}`);
  console.log(`  Available seats:`, availableSeats.map(s => s.number));
  console.log(`  Booked seats:`, bookedSeats.map(s => s.number));
  
  if (availableSeats.length < count || bookedSeats.length === 0) {
    console.log(`  ❌ Early return: availableSeats.length=${availableSeats.length}, bookedSeats.length=${bookedSeats.length}`);
    return null;
  }
  
  // Find the best adjacent seat (closest to center)
  console.log(`  🔍 Looking for single adjacent seat...`);
  const adjacentSeat = findSingleAdjacentSeat(row, availableSeats, bookedSeats);
  console.log(`  Single adjacent seat found:`, adjacentSeat ? `Seat ${adjacentSeat.number}` : 'null');
  
  if (!adjacentSeat) {
    console.log(`  ❌ No adjacent seat found`);
    return null;
  }
  
  // Grow from that adjacent seat toward center
  console.log(`  🔍 Growing from adjacent seat ${adjacentSeat.number}...`);
  const result = growFromAdjacentSeat(adjacentSeat, count, availableSeats);
  console.log(`  Final result:`, result ? result.map(s => s.number) : 'null');
  
  return result;
};

/**
 * Grow carrot incrementally (+1 seat per click) with outward expansion priority
 */
export const growCarrotIncrementally = (currentCarrot: Seat[], availableSeats: Seat[]): Seat[] | null => {
  if (currentCarrot.length === 0) return null;
  
  const row = currentCarrot[0].row;
  const rowCenter = getRowCenter(row);
  const sortedCarrot = currentCarrot.sort((a, b) => a.number - b.number);
  const sortedAvailable = availableSeats.sort((a, b) => a.number - b.number);
  
  const minCarrot = sortedCarrot[0].number;
  const maxCarrot = sortedCarrot[sortedCarrot.length - 1].number;
  const currentBlockCenter = (minCarrot + maxCarrot) / 2;
  
  // Find left and right expansion options (only +1 seat)
  let leftCandidate: Seat | null = null;
  let rightCandidate: Seat | null = null;
  
  // Find left expansion candidate
  for (let i = sortedAvailable.length - 1; i >= 0; i--) {
    const seat = sortedAvailable[i];
    if (seat.number === minCarrot - 1) { // Directly adjacent left
      leftCandidate = seat;
      break;
    }
  }
  
  // Find right expansion candidate
  for (let i = 0; i < sortedAvailable.length; i++) {
    const seat = sortedAvailable[i];
    if (seat.number === maxCarrot + 1) { // Directly adjacent right
      rightCandidate = seat;
      break;
    }
  }
  
  // OUTWARD EXPANSION RULE: Prefer expansion away from center
  let bestCandidate: Seat | null = null;
  
  if (leftCandidate && rightCandidate) {
    // Both options available - choose based on outward expansion
    const leftNewCenter = (leftCandidate.number + maxCarrot) / 2;
    const rightNewCenter = (minCarrot + rightCandidate.number) / 2;
    
    const leftDistanceFromCenter = Math.abs(leftNewCenter - rowCenter);
    const rightDistanceFromCenter = Math.abs(rightNewCenter - rowCenter);
    
    // Prefer the option that moves the block center AWAY from row center
    if (leftDistanceFromCenter > rightDistanceFromCenter) {
      bestCandidate = leftCandidate;
    } else if (rightDistanceFromCenter > leftDistanceFromCenter) {
      bestCandidate = rightCandidate;
    } else {
      // Equidistant - prefer the one that keeps block more centered
      bestCandidate = currentBlockCenter < rowCenter ? rightCandidate : leftCandidate;
    }
  } else if (leftCandidate) {
    bestCandidate = leftCandidate;
  } else if (rightCandidate) {
    bestCandidate = rightCandidate;
  }
  
  if (bestCandidate) {
    const newCarrot = [...sortedCarrot, bestCandidate].sort((a, b) => a.number - b.number);
    if (isStrictlyContiguous(row, newCarrot)) {
      return newCarrot;
    }
  }
  
  return null;
};

export const growCarrotHorizontally = (currentCarrot: Seat[], newCount: number, availableSeats: Seat[]): Seat[] | null => {
  if (currentCarrot.length === 0 || availableSeats.length < newCount) return null;
  
  const row = currentCarrot[0].row;
  const sortedCarrot = currentCarrot.sort((a, b) => a.number - b.number);
  const sortedAvailable = availableSeats.sort((a, b) => a.number - b.number);
  
  const minCarrot = sortedCarrot[0].number;
  const maxCarrot = sortedCarrot[sortedCarrot.length - 1].number;
  
  const leftExpansion: Seat[] = [];
  const rightExpansion: Seat[] = [];
  
  for (let i = sortedAvailable.length - 1; i >= 0; i--) {
    const seat = sortedAvailable[i];
    if (seat.number < minCarrot) {
      leftExpansion.unshift(seat);
      if (leftExpansion.length === (newCount - currentCarrot.length)) break;
    }
  }
  
  for (let i = 0; i < sortedAvailable.length; i++) {
    const seat = sortedAvailable[i];
    if (seat.number > maxCarrot) {
      rightExpansion.push(seat);
      if (rightExpansion.length === (newCount - currentCarrot.length)) break;
    }
  }
  
  if (leftExpansion.length === (newCount - currentCarrot.length)) {
    const expandedBlock = [...leftExpansion, ...sortedCarrot];
    if (isStrictlyContiguous(row, expandedBlock)) {
      return expandedBlock;
    }
  }
  
  if (rightExpansion.length === (newCount - currentCarrot.length)) {
    const expandedBlock = [...sortedCarrot, ...rightExpansion];
    if (isStrictlyContiguous(row, expandedBlock)) {
      return expandedBlock;
    }
  }
  
  return null;
};

export const growCarrotVertically = (currentCarrot: Seat[], newCount: number, availableSeats: Seat[], cls: any): Seat[] | null => {
  if (currentCarrot.length === 0) return null;
  
  const currentRow = currentCarrot[0].row;
  const currentRowIndex = cls.rows.indexOf(currentRow);
  const baseRow = getBaseRowForClass(cls);
  const baseIndex = cls.rows.indexOf(baseRow);
  
  if (currentRowIndex >= baseIndex) return null;
  
  const nextRowIndex = currentRowIndex + 1;
  if (nextRowIndex >= cls.rows.length) return null;
  
  const nextRow = cls.rows[nextRowIndex];
  const nextRowSeats = availableSeats.filter(seat => seat.row === nextRow);
  
  if (nextRowSeats.length < newCount) return null;
  
  const centerBlock = startCarrotAtCenter(nextRow, newCount, nextRowSeats);
  return centerBlock;
};

export const hasHitBaseLine = (currentCarrot: Seat[], cls: any): boolean => {
  if (currentCarrot.length === 0) return false;
  
  const currentRow = currentCarrot[0].row;
  const baseRow = getBaseRowForClass(cls);
  const currentIndex = cls.rows.indexOf(currentRow);
  const baseIndex = cls.rows.indexOf(baseRow);
  
  return currentIndex >= baseIndex;
};

export const widenCarrotHorizontally = (carrotRows: string[], baseRow: string, availableSeats: Seat[]): Seat[] | null => {
  const rowsAboveBase = carrotRows.filter(row => {
    const rowIndex = carrotRows.indexOf(row);
    const baseIndex = carrotRows.indexOf(baseRow);
    return rowIndex < baseIndex;
  });
  
  const widenedSeats: Seat[] = [];
  
  for (const row of rowsAboveBase) {
    const rowSeats = availableSeats.filter(seat => seat.row === row);
    widenedSeats.push(...rowSeats);
  }
  
  return widenedSeats.length > 0 ? widenedSeats : null;
};

export const expandIntoPenaltyZone = (classRows: string[], baseRow: string, availableSeats: Seat[]): Seat[] | null => {
  const penaltyRows = classRows.slice(classRows.indexOf(baseRow));
  const expandedSeats: Seat[] = [];
  
  for (const row of penaltyRows) {
    const rowSeats = availableSeats.filter(seat => seat.row === row);
    expandedSeats.push(...rowSeats);
  }
  
  return expandedSeats.length > 0 ? expandedSeats : null;
};

export const findBestCarrotPosition = (cls: any, count: number, availableSeats: Seat[], selectedSeats: Seat[], currentRow?: string): Seat[] | null => {
  const searchableSeats = [...availableSeats, ...selectedSeats];
  
  let bestBlock: Seat[] | null = null;
  let bestScore = -Infinity;
  
  const rowsToSearch = currentRow ? [currentRow, ...cls.rows.filter(r => r !== currentRow)] : cls.rows;
  
  for (const row of rowsToSearch) {
    const rowSeats = searchableSeats.filter(seat => seat.row === row);
    if (rowSeats.length < count) continue;
    
    const sortedRowSeats = rowSeats.sort((a, b) => a.number - b.number);
    
    for (let i = 0; i <= sortedRowSeats.length - count; i++) {
      const block = sortedRowSeats.slice(i, i + count);
      
      if (isStrictlyContiguous(row, block)) {
        const score = calculateCarrotScore(block, row, cls, currentRow);
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = block;
        }
      }
    }
  }
  
  return bestBlock;
};

const calculateCarrotScore = (block: Seat[], row: string, cls: any, currentRow?: string): number => {
  const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
  const rowCenter = getRowCenter(row);
  const centerDistance = Math.abs(blockCenter - rowCenter);
  
  // Center weight (~60%)
  const centerScore = Math.max(0, 100 - centerDistance * 8);
  
  // ROW PRIORITY BONUS - Fixed priority system
  let rowPriorityBonus = 0;
  if (currentRow && row === currentRow) {
    rowPriorityBonus = 1000; // MASSIVE bonus to stay in current row
  } else {
    // Fixed row priority system - G and H have LOWEST priority (1 point)
    const rowIdx = cls.rows.indexOf(row);
    const rowPriorities = [500, 400, 300, 200, 100, 50, 1, 1]; // A, B, C, D, E, F, G, H
    rowPriorityBonus = rowPriorities[rowIdx] || 0;
  }
  
  // Heavy penalty for rows at/after base (G/H for CLASSIC; F/G for FIRST)
  const baseRow = getBaseRowForClass(cls);
  const baseIdx = cls.rows.indexOf(baseRow);
  const rowIdx = cls.rows.indexOf(row);
  let bottomPenalty = 0;
  if (rowIdx >= baseIdx) bottomPenalty = -500 - (rowIdx - baseIdx) * 100;
  
  // Avoid orphans
  const layout = seatsByRow[row] || [];
  const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
  const leftBuffer = block[0].number - 1;
  const rightBuffer = (nums[nums.length - 1] || 26) - block[block.length - 1].number;
  const bufferScore = Math.min(leftBuffer, rightBuffer) * 2;
  
  const containerScore = hasAisles(row) ? 5 : 0;
  const total = centerScore + rowPriorityBonus + bottomPenalty + bufferScore + containerScore;
  
  // 🚨 ADD DEBUG LOGS HERE 🚨
  console.log(`🔍 SCORE DEBUG: Row ${row}, Seats ${block[0].number}-${block[block.length - 1].number}`);
  console.log(`  📍 Center Score: ${centerScore.toFixed(1)}`);
  console.log(`  📈 Row Priority Bonus: ${rowPriorityBonus}`);
  console.log(`  ⬇️ Bottom Penalty: ${bottomPenalty}`);
  console.log(`  📦 Buffer Score: ${bufferScore}`);
  console.log(`  🎯 Container Score: ${containerScore}`);
  console.log(`  ⭐ TOTAL SCORE: ${total.toFixed(1)}`);
  
  return total;
};