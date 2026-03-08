/**
 * Format seat numbers as range format (e.g., "4 - 6" instead of "4,5,6")
 * Extracted from Index.tsx
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

