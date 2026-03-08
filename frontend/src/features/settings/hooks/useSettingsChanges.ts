/**
 * Settings changes tracking hook
 * Extracted from Settings.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ShowTimeSettings } from '@/store/settingsStore';

export function useSettingsChanges(
  isDirty: boolean,
  localShowTimes: ShowTimeSettings[],
  showTimes: ShowTimeSettings[]
) {
  const [showSaveButton, setShowSaveButton] = useState(false);
  const hasChangesRef = useRef(false);

  const hasChanges = useCallback(() => {
    const pricingChanged = isDirty;
    const showTimesChanged = JSON.stringify(localShowTimes) !== JSON.stringify(showTimes);
    return pricingChanged || showTimesChanged;
  }, [isDirty, localShowTimes, showTimes]);

  useEffect(() => {
    const hasAnyChanges = hasChanges();
    if (hasAnyChanges) {
      setShowSaveButton(true);
      hasChangesRef.current = true;
    } else {
      // Auto-hide when there are no changes
      setShowSaveButton(false);
      hasChangesRef.current = false;
    }
  }, [hasChanges]);

  return {
    showSaveButton,
    setShowSaveButton,
    hasChangesRef,
    hasChanges
  };
}

