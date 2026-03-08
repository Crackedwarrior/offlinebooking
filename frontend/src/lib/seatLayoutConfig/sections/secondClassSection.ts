import { TheaterSection } from '../types';

export const secondClassSection: TheaterSection = {
  id: 'second-class-section',
  name: 'Second Class Section',
  classKey: 'SECOND_CLASS',
  classLabel: 'SECOND CLASS',
  price: 50,
  color: 'bg-gray-200',
  totalSeats: 60,
  rows: [
    { id: 'SC2-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
    { id: 'SC2-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 }
  ]
};

