/**
 * Show time validation hook
 * Extracted from Settings.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import type { ShowTimeSettings } from '@/store/settingsStore';
import { computeOverlapErrors } from '../utils/timeValidation';

export function useShowTimeValidation(showTimes: ShowTimeSettings[]) {
  const [overlapErrors, setOverlapErrors] = useState<string[]>([]);

  const recomputeOverlaps = useCallback(() => {
    setOverlapErrors(computeOverlapErrors(showTimes));
  }, [showTimes]);

  useEffect(() => {
    recomputeOverlaps();
  }, [recomputeOverlaps]);

  // Expose a function to manually update errors (for immediate validation)
  const updateOverlapErrors = useCallback((shows: ShowTimeSettings[]) => {
    setOverlapErrors(computeOverlapErrors(shows));
  }, []);

  return {
    overlapErrors,
    setOverlapErrors,
    recomputeOverlaps,
    updateOverlapErrors
  };
}

