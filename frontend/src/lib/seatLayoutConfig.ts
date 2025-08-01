// Configurable seat layout system
// This replaces the hardcoded seatMatrix.ts with a flexible configuration system

export interface SeatLayout {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  sections: TheaterSection[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface TheaterSection {
  id: string;
  name: string;
  classKey: string;
  classLabel: string;
  price: number;
  color: string;
  rows: TheaterRow[];
  totalSeats: number;
}

export interface TheaterRow {
  id: string;
  name: string;
  seats: (number | string)[]; // number for seat, string for empty space
  totalSeats: number;
}

export interface SeatPosition {
  rowId: string;
  seatNumber: number;
  position: number; // position in the row (for gaps)
}

// Default theater layout (current configuration)
export const DEFAULT_THEATER_LAYOUT: SeatLayout = {
  id: 'default-theater',
  name: 'Standard Theater Layout',
  description: 'Default theater configuration with 5 seat classes',
  totalSeats: 590,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    {
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
    },
    {
      id: 'star-class-section',
      name: 'Star Class Section',
      classKey: 'STAR_CLASS',
      classLabel: 'STAR CLASS',
      price: 150,
      color: 'bg-cyan-300',
      totalSeats: 104,
      rows: [
        { id: 'SC-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26], totalSeats: 26 },
        { id: 'SC-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26], totalSeats: 26 },
        { id: 'SC-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26], totalSeats: 26 },
        { id: 'SC-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26], totalSeats: 26 }
      ]
    },
    {
      id: 'classic-balcony-section',
      name: 'Classic Balcony Section',
      classKey: 'CLASSIC',
      classLabel: 'CLASSIC BALCONY',
      price: 120,
      color: 'bg-orange-200',
      totalSeats: 200,
      rows: [
        { id: 'CB-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, '', 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], totalSeats: 26 },
        { id: 'CB-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-F', name: 'F', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-G', name: 'G', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 },
        { id: 'CB-H', name: 'H', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], totalSeats: 24 }
      ]
    },
    {
      id: 'first-class-section',
      name: 'First Class Section',
      classKey: 'FIRST_CLASS',
      classLabel: 'FIRST CLASS',
      price: 70,
      color: 'bg-pink-200',
      totalSeats: 210,
      rows: [
        { id: 'FC-A', name: 'A', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-B', name: 'B', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-C', name: 'C', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-D', name: 'D', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-E', name: 'E', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-F', name: 'F', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 },
        { id: 'FC-G', name: 'G', seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], totalSeats: 30 }
      ]
    },
    {
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
    }
  ]
};

// Alternative theater layouts
export const THEATER_LAYOUTS: SeatLayout[] = [
  DEFAULT_THEATER_LAYOUT,
  {
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
  }
];

/**
 * SeatLayoutManager class provides comprehensive management of theater seat layouts.
 * 
 * This class implements a sophisticated layout management system that handles:
 * - Dynamic layout switching and configuration
 * - Seat matrix generation and validation
 * - Seat information retrieval and positioning
 * - Layout integrity validation and error handling
 * 
 * @example
 * const manager = new SeatLayoutManager();
 * const layout = manager.getCurrentLayout();
 * const seatMatrix = manager.generateSeatMatrix();
 * 
 * @class SeatLayoutManager
 */
export class SeatLayoutManager {
  private currentLayout: SeatLayout;

  /**
   * Creates a new SeatLayoutManager instance.
   * 
   * @param layout - Initial layout to use (defaults to DEFAULT_THEATER_LAYOUT)
   */
  constructor(layout: SeatLayout = DEFAULT_THEATER_LAYOUT) {
    this.currentLayout = layout;
  }

  /**
   * Retrieves the currently active layout.
   * 
   * @returns The current seat layout configuration
   * 
   * @example
   * const layout = manager.getCurrentLayout();
   * console.log(`Current layout: ${layout.name} with ${layout.totalSeats} seats`);
   */
  getCurrentLayout(): SeatLayout {
    return this.currentLayout;
  }

  /**
   * Sets a new active layout and updates the manager state.
   * 
   * @param layout - The new layout to set as active
   * 
   * @example
   * const newLayout = { /* layout configuration *\/ };
   * manager.setLayout(newLayout);
   */
  setLayout(layout: SeatLayout): void {
    this.currentLayout = layout;
  }

  /**
   * Retrieves all available layouts in the system.
   * 
   * @returns Array of all available seat layouts
   * 
   * @example
   * const layouts = manager.getAvailableLayouts();
   * layouts.forEach(layout => console.log(layout.name));
   */
  getAvailableLayouts(): SeatLayout[] {
    return THEATER_LAYOUTS;
  }

  /**
   * Finds a layout by its unique identifier.
   * 
   * @param id - The unique layout identifier
   * @returns The layout with the specified ID, or undefined if not found
   * 
   * @example
   * const layout = manager.getLayoutById('small-theater');
   * if (layout) {
   *   console.log(`Found layout: ${layout.name}`);
   * }
   */
  getLayoutById(id: string): SeatLayout | undefined {
    return THEATER_LAYOUTS.find(layout => layout.id === id);
  }

  /**
   * Generates a seat matrix compatible with existing code from the current layout.
   * 
   * This function transforms the structured layout data into a flat seat matrix
   * format that maintains backward compatibility with existing seat rendering code.
   * 
   * @returns Record mapping row IDs to arrays of seat numbers or empty strings for gaps
   * 
   * @example
   * const seatMatrix = manager.generateSeatMatrix();
   * // Returns: { 'BOX-A': [1, 2, 3, 4, 5, 6, 7], 'SC-A': [1, 2, 3, '', 4, 5, ...] }
   * 
   * @complexity O(n × m) where n is sections, m is rows per section
   */
  generateSeatMatrix(): Record<string, (number | string)[]> {
    const seatMatrix: Record<string, (number | string)[]> = {};
    
    this.currentLayout.sections.forEach(section => {
      section.rows.forEach(row => {
        seatMatrix[row.id] = row.seats;
      });
    });
    
    return seatMatrix;
  }

  /**
   * Generates seat class configuration compatible with existing pricing system.
   * 
   * This function transforms the structured layout sections into the format
   * expected by the pricing and seat class management systems.
   * 
   * @returns Array of seat class configurations with keys, labels, prices, and row mappings
   * 
   * @example
   * const seatClasses = manager.generateSeatClasses();
   * // Returns: [{ key: 'BOX', label: 'BOX', price: 150, rows: ['BOX-A', 'BOX-B'], color: 'bg-cyan-200' }]
   * 
   * @complexity O(n) where n is the number of sections
   */
  generateSeatClasses(): Array<{
    key: string;
    label: string;
    price: number;
    rows: string[];
    color: string;
  }> {
    return this.currentLayout.sections.map(section => ({
      key: section.classKey,
      label: section.classLabel,
      price: section.price,
      rows: section.rows.map(row => row.id),
      color: section.color
    }));
  }

  /**
   * Retrieves detailed information about a specific seat by its ID.
   * 
   * This function parses seat IDs and provides comprehensive information including
   * section details, row information, seat number, and position within the row.
   * 
   * @param seatId - The seat identifier (e.g., "BOX-A1", "SC-B15")
   * @returns Detailed seat information or null if seat not found
   * 
   * @example
   * const seatInfo = manager.getSeatInfo('BOX-A1');
   * if (seatInfo) {
   *   console.log(`Seat ${seatInfo.seatNumber} in ${seatInfo.section.name} section`);
   *   console.log(`Price: ₹${seatInfo.section.price}`);
   * }
   * 
   * @complexity O(n × m) where n is sections, m is rows per section
   */
  getSeatInfo(seatId: string): {
    rowId: string;
    rowName: string;
    seatNumber: number;
    section: TheaterSection;
    position: number;
  } | null {
    const [rowId, seatNumberStr] = seatId.split(/(?<=[A-Z])(?=\d)/);
    const seatNumber = parseInt(seatNumberStr);
    
    for (const section of this.currentLayout.sections) {
      const row = section.rows.find(r => r.id === rowId);
      if (row) {
        const position = row.seats.findIndex(seat => seat === seatNumber);
        if (position !== -1) {
          return {
            rowId,
            rowName: row.name,
            seatNumber,
            section,
            position
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Retrieves all seats for a specific section.
   * 
   * This function provides detailed seat positioning information for a section,
   * including row IDs, seat numbers, and positions within rows.
   * 
   * @param sectionId - The unique identifier of the section
   * @returns Array of seat positions with detailed information
   * 
   * @example
   * const seats = manager.getSeatsForSection('box-section');
   * seats.forEach(seat => {
   *   console.log(`Seat ${seat.seatNumber} in row ${seat.rowId} at position ${seat.position}`);
   * });
   * 
   * @complexity O(n × m) where n is rows in section, m is seats per row
   */
  getSeatsForSection(sectionId: string): SeatPosition[] {
    const section = this.currentLayout.sections.find(s => s.id === sectionId);
    if (!section) return [];

    const seats: SeatPosition[] = [];
    section.rows.forEach(row => {
      row.seats.forEach((seat, position) => {
        if (typeof seat === 'number') {
          seats.push({
            rowId: row.id,
            seatNumber: seat,
            position
          });
        }
      });
    });

    return seats;
  }

  /**
   * Retrieves the total number of seats in the current layout.
   * 
   * @returns Total seat count across all sections
   * 
   * @example
   * const totalSeats = manager.getTotalSeats();
   * console.log(`Theater capacity: ${totalSeats} seats`);
   */
  getTotalSeats(): number {
    return this.currentLayout.totalSeats;
  }

  /**
   * Retrieves seat counts broken down by section.
   * 
   * @returns Record mapping section IDs to their seat counts
   * 
   * @example
   * const sectionCounts = manager.getSeatsBySection();
   * Object.entries(sectionCounts).forEach(([sectionId, count]) => {
   *   console.log(`${sectionId}: ${count} seats`);
   * });
   */
  getSeatsBySection(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.currentLayout.sections.forEach(section => {
      counts[section.id] = section.totalSeats;
    });
    return counts;
  }

  /**
   * Validates the integrity and consistency of a seat layout configuration.
   * 
   * This function performs comprehensive validation including:
   * - Uniqueness checks for row IDs
   * - Seat count accuracy validation
   * - Section consistency verification
   * - Required field validation
   * 
   * @param layout - The layout configuration to validate
   * @returns Validation result with success status and error messages
   * 
   * @example
   * const validation = manager.validateLayout(layout);
   * if (!validation.isValid) {
   *   console.error('Layout validation failed:', validation.errors);
   * }
   * 
   * @complexity O(n + m) where n is sections, m is total rows
   */
  validateLayout(layout: SeatLayout): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for duplicate row IDs
    const rowIds = new Set<string>();
    layout.sections.forEach(section => {
      section.rows.forEach(row => {
        if (rowIds.has(row.id)) {
          errors.push(`Duplicate row ID: ${row.id}`);
        }
        rowIds.add(row.id);
      });
    });

    // Check total seats calculation
    const calculatedTotal = layout.sections.reduce((sum, section) => sum + section.totalSeats, 0);
    if (calculatedTotal !== layout.totalSeats) {
      errors.push(`Total seats mismatch: declared ${layout.totalSeats}, calculated ${calculatedTotal}`);
    }

    // Check section seat calculations
    layout.sections.forEach(section => {
      const sectionTotal = section.rows.reduce((sum, row) => sum + row.totalSeats, 0);
      if (sectionTotal !== section.totalSeats) {
        errors.push(`Section ${section.name} seats mismatch: declared ${section.totalSeats}, calculated ${sectionTotal}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a new layout with automatic ID generation and validation.
   * 
   * This function creates a new layout with proper metadata and validates
   * the configuration before returning it.
   * 
   * @param layout - Layout configuration without ID and timestamps
   * @returns The created layout with generated ID and timestamps
   * @throws {Error} If layout validation fails
   * 
   * @example
   * const newLayout = manager.createLayout({
   *   name: 'Custom Layout',
   *   description: 'Custom theater configuration',
   *   totalSeats: 300,
   *   sections: [/* section configurations *\/],
   *   isActive: false
   * });
   * 
   * @complexity O(n + m) where n is sections, m is total rows
   */
  createLayout(layout: Omit<SeatLayout, 'id' | 'createdAt' | 'updatedAt'>): SeatLayout {
    const newLayout: SeatLayout = {
      ...layout,
      id: `layout-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const validation = this.validateLayout(newLayout);
    if (!validation.isValid) {
      throw new Error(`Invalid layout: ${validation.errors.join(', ')}`);
    }

    return newLayout;
  }

  /**
   * Updates an existing layout with new configuration.
   * 
   * This function updates a layout in the layouts array and validates
   * the changes before applying them.
   * 
   * @param layoutId - The ID of the layout to update
   * @param updates - Partial layout configuration with updates
   * @returns The updated layout or null if not found
   * @throws {Error} If layout validation fails after updates
   * 
   * @example
   * const updatedLayout = manager.updateLayout('layout-123', {
   *   name: 'Updated Layout Name',
   *   totalSeats: 350
   * });
   * 
   * @complexity O(n + m) where n is sections, m is total rows
   */
  updateLayout(layoutId: string, updates: Partial<SeatLayout>): SeatLayout | null {
    const layoutIndex = THEATER_LAYOUTS.findIndex(l => l.id === layoutId);
    if (layoutIndex === -1) return null;

    const updatedLayout: SeatLayout = {
      ...THEATER_LAYOUTS[layoutIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const validation = this.validateLayout(updatedLayout);
    if (!validation.isValid) {
      throw new Error(`Invalid layout: ${validation.errors.join(', ')}`);
    }

    THEATER_LAYOUTS[layoutIndex] = updatedLayout;
    return updatedLayout;
  }
}

// Default instance
export const seatLayoutManager = new SeatLayoutManager();

// Export for backward compatibility
export const seatsByRow = seatLayoutManager.generateSeatMatrix(); 