import { TheaterSection } from '../types';

export const boxSection: TheaterSection = {
  id: 'box-section',
  name: 'Box Section',
  classKey: 'BOX',
  classLabel: 'BOX',
  price: 150,
  color: 'bg-cyan-200',
  totalSeats: 18,
  rows: [
    { id: 'BOX-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7], totalSeats: 7 },
    { id: 'BOX-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7], totalSeats: 7 },
    { id: 'BOX-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8], totalSeats: 8 }
  ]
};

