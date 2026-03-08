import { SeatLayout } from './types';
import { boxSection } from './sections/boxSection';
import { starClassSection } from './sections/starClassSection';
import { classicBalconySection } from './sections/classicBalconySection';
import { firstClassSection } from './sections/firstClassSection';
import { secondClassSection } from './sections/secondClassSection';

/**
 * Creates the default theater layout from section data.
 * This function builds the complete layout by combining all sections.
 * 
 * @returns The default theater layout configuration
 */
export function createDefaultLayout(): SeatLayout {
  return {
    id: 'default-theater',
    name: 'Standard Theater Layout',
    description: 'Default theater configuration with 5 seat classes',
    totalSeats: 590,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      boxSection,
      starClassSection,
      classicBalconySection,
      firstClassSection,
      secondClassSection
    ]
  };
}

// Export the default layout as a constant (lazy-loaded on first access)
let _defaultLayout: SeatLayout | null = null;

export function getDefaultLayout(): SeatLayout {
  if (!_defaultLayout) {
    _defaultLayout = createDefaultLayout();
  }
  return _defaultLayout;
}

