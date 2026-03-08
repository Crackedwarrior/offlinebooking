/**
 * Settings form management hook
 * Extracted from Settings.tsx
 */

import { useForm } from 'react-hook-form';
import { useSettingsStore } from '@/store/settingsStore';
import { useEffect } from 'react';

export function useSettingsForm() {
  const { pricing } = useSettingsStore();
  
  const { register, handleSubmit, watch, setValue, reset, formState: { isDirty } } = useForm({
    defaultValues: pricing || {}
  });

  const watchedPricing = watch();

  // Reset form when pricing changes from store
  useEffect(() => {
    if (pricing) {
      reset(pricing);
    }
  }, [pricing, reset]);

  return {
    register,
    handleSubmit,
    watchedPricing,
    setValue,
    reset,
    isDirty
  };
}

