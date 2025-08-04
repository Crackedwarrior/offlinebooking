import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Custom hook for reactive pricing updates
 * Ensures components re-render when pricing changes
 */
export const usePricing = () => {
  const [pricingVersion, setPricingVersion] = useState(0);
  const { pricing, getPriceForClass } = useSettingsStore();

  useEffect(() => {
    const handlePricingUpdate = () => {
      setPricingVersion(prev => prev + 1);
    };

    // Listen for pricing updates from settings
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    
    return () => {
      window.removeEventListener('pricingUpdated', handlePricingUpdate);
    };
  }, []);

  return {
    pricing,
    getPriceForClass,
    pricingVersion, // Use this to force re-renders
    isPricingUpdated: pricingVersion > 0
  };
};

/**
 * Hook to get price for a specific seat class with reactivity
 */
export const usePriceForClass = (classLabel: string) => {
  const { getPriceForClass, pricingVersion } = usePricing();
  return {
    price: getPriceForClass(classLabel),
    pricingVersion
  };
};

/**
 * Hook to get price for a seat row with reactivity
 */
export const usePriceForSeat = (row: string) => {
  const { getPriceForClass, pricingVersion } = usePricing();
  
  // Get seat class from row
  const getSeatClassByRow = (row: string) => {
    const seatClasses = [
      { label: 'BOX', rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
      { label: 'STAR CLASS', rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
      { label: 'CLASSIC', rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
      { label: 'FIRST CLASS', rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
      { label: 'SECOND CLASS', rows: ['SC2-A', 'SC2-B'] }
    ];
    
    return seatClasses.find(cls => cls.rows.includes(row));
  };

  const seatClass = getSeatClassByRow(row);
  
  return {
    price: seatClass ? getPriceForClass(seatClass.label) : 0,
    classLabel: seatClass?.label || 'UNKNOWN',
    pricingVersion
  };
}; 