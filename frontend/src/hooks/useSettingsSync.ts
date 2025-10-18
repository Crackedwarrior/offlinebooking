// Hook to automatically sync settings with backend
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export const useSettingsSync = () => {
  const loadSettingsFromBackend = useSettingsStore(state => state.loadSettingsFromBackend);
  const saveSettingsToBackend = useSettingsStore(state => state.saveSettingsToBackend);

  useEffect(() => {
    // Load settings from backend when component mounts
    const initializeSettings = async () => {
      console.log('[SETTINGS] Initializing settings sync...');
      await loadSettingsFromBackend();
    };

    initializeSettings();
  }, [loadSettingsFromBackend]);

  // Return the save function for manual saves
  return {
    saveSettingsToBackend
  };
};

export default useSettingsSync;
