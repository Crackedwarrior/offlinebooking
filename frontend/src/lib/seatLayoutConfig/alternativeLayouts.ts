import { SeatLayout } from './types';
import { getDefaultLayout } from './defaultLayout';

/**
 * Alternative theater layouts.
 * This function is lazy-loadable to avoid loading unused layouts in the initial bundle.
 * 
 * @returns Promise resolving to array of all available layouts
 */
export async function getAlternativeLayouts(): Promise<SeatLayout[]> {
  const defaultLayout = getDefaultLayout();
  
  const smallTheaterLayout: SeatLayout = {
    id: 'small-theater',
    name: 'Small Theater Layout',
    description: 'Compact theater with 3 seat classes',
    totalSeats: 200,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'premium-section',
        name: 'Premium Section',
        classKey: 'PREMIUM',
        classLabel: 'PREMIUM',
        price: 200,
        color: 'bg-purple-200',
        totalSeats: 50,
        rows: [
          { id: 'PREM-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'PREM-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'PREM-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'PREM-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'PREM-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 }
        ]
      },
      {
        id: 'standard-section',
        name: 'Standard Section',
        classKey: 'STANDARD',
        classLabel: 'STANDARD',
        price: 150,
        color: 'bg-blue-200',
        totalSeats: 100,
        rows: [
          { id: 'STD-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
          { id: 'STD-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
          { id: 'STD-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
          { id: 'STD-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
          { id: 'STD-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 }
        ]
      },
      {
        id: 'economy-section',
        name: 'Economy Section',
        classKey: 'ECONOMY',
        classLabel: 'ECONOMY',
        price: 100,
        color: 'bg-green-200',
        totalSeats: 50,
        rows: [
          { id: 'ECO-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'ECO-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'ECO-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'ECO-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
          { id: 'ECO-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 }
        ]
      }
    ]
  };

  return [defaultLayout, smallTheaterLayout];
}

// Synchronous version for backward compatibility (eagerly loaded)
let _theaterLayouts: SeatLayout[] | null = null;

export function getTheaterLayouts(): SeatLayout[] {
  if (!_theaterLayouts) {
    const defaultLayout = getDefaultLayout();
    const smallTheaterLayout: SeatLayout = {
      id: 'small-theater',
      name: 'Small Theater Layout',
      description: 'Compact theater with 3 seat classes',
      totalSeats: 200,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: 'premium-section',
          name: 'Premium Section',
          classKey: 'PREMIUM',
          classLabel: 'PREMIUM',
          price: 200,
          color: 'bg-purple-200',
          totalSeats: 50,
          rows: [
            { id: 'PREM-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'PREM-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'PREM-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'PREM-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'PREM-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 }
          ]
        },
        {
          id: 'standard-section',
          name: 'Standard Section',
          classKey: 'STANDARD',
          classLabel: 'STANDARD',
          price: 150,
          color: 'bg-blue-200',
          totalSeats: 100,
          rows: [
            { id: 'STD-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
            { id: 'STD-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
            { id: 'STD-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
            { id: 'STD-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 },
            { id: 'STD-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], totalSeats: 20 }
          ]
        },
        {
          id: 'economy-section',
          name: 'Economy Section',
          classKey: 'ECONOMY',
          classLabel: 'ECONOMY',
          price: 100,
          color: 'bg-green-200',
          totalSeats: 50,
          rows: [
            { id: 'ECO-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'ECO-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'ECO-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'ECO-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 },
            { id: 'ECO-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], totalSeats: 10 }
          ]
        }
      ]
    };
    _theaterLayouts = [defaultLayout, smallTheaterLayout];
  }
  return _theaterLayouts;
}

