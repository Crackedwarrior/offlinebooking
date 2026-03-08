/**
 * Settings Component (Refactored)
 * Main orchestrator component for settings management
 */

import React, { useState, useCallback } from 'react';
import { useSettingsStore, ShowTimeSettings } from '@/store/settingsStore';
import { SettingsErrorBoundary } from '@/components/SpecializedErrorBoundaries';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';

// Extracted components
import { OverviewTab } from '../tabs/OverviewTab';
import { PricingTab } from '../tabs/PricingTab';
import { ShowTimesTab } from '../tabs/ShowTimesTab';
import { MoviesTab } from '../tabs/MoviesTab';
import { BookingsTab } from '../tabs/BookingsTab';
import { PrinterTab } from '../tabs/PrinterTab';
import { ErrorDisplay } from './ErrorDisplay';

// Extracted hooks
import { useSettingsForm } from '../hooks/useSettingsForm';
import { useShowTimeValidation } from '../hooks/useShowTimeValidation';
import { useSettingsChanges } from '../hooks/useSettingsChanges';

// Types
import type { SettingsTab } from '../types';

const Settings = () => {
  const { 
    pricing, 
    showTimes, 
    updatePricing, 
    updateShowTime, 
    deleteShowTime, 
    resetToDefaults, 
    saveSettingsToBackend 
  } = useSettingsStore();
  
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  
  // Reset save button when switching tabs if that tab has no changes
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as SettingsTab);
    // For tabs that don't have their own save mechanism, only show button if there are actual changes
    // The button will be controlled by the useSettingsChanges hook based on actual changes
    // No need to manually reset here - let the hook handle it
  }, []);

  // Use extracted hooks
  const { register, watchedPricing, setValue, reset, isDirty } = useSettingsForm();
  const { overlapErrors, updateOverlapErrors } = useShowTimeValidation(localShowTimes);
  const { showSaveButton, setShowSaveButton, hasChangesRef } = useSettingsChanges(
    isDirty,
    localShowTimes,
    showTimes
  );

  // Handle show time changes
  const handleShowTimeChange = useCallback((key: string, field: keyof ShowTimeSettings, value: string | boolean) => {
    setLocalShowTimes(prev => {
      const next = prev.map(show => show.key === key ? { ...show, [field]: value } : show);
      // Immediate validation using updated array to avoid stale state timing
      updateOverlapErrors(next);
      return next;
    });
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, [updateOverlapErrors, hasChangesRef, setShowSaveButton]);

  // Handle saving individual show time
  const handleSaveShowTime = useCallback(async (key: string) => {
    try {
      const showToSave = localShowTimes.find(s => s.key === key);
      if (!showToSave) return;

      // Check for overlaps for this specific show
      const showOverlapErrors = overlapErrors.filter(e => e.includes(showToSave.label));
      if (showOverlapErrors.length > 0) {
        setError('Please resolve overlapping show times before saving.');
        return;
      }

      // Update show time settings (LOCAL)
      updateShowTime(key, showToSave);

      // SAVE TO BACKEND
      console.log('[SETTINGS] Saving show time to backend...');
      await saveSettingsToBackend();
      console.log('[SETTINGS] Show time saved to backend successfully');

      // After saving, sync localShowTimes with the store's showTimes
      // This ensures the useSettingsChanges hook correctly detects if there are remaining changes
      const updatedStoreShowTimes = useSettingsStore.getState().showTimes;
      setLocalShowTimes(updatedStoreShowTimes);
    } catch (error) {
      console.error('❌ Error saving show time:', error);
      setError('Failed to save show time. Please try again.');
    }
  }, [localShowTimes, overlapErrors, updateShowTime, saveSettingsToBackend]);

  // Save all changes
  const handleSave = useCallback(async () => {
    try {
      if (overlapErrors.length > 0) {
        setError('Please resolve overlapping show times before saving.');
        return;
      }
      // Get current form values
      const formValues = watchedPricing;
      
      // Update pricing settings (LOCAL)
      Object.entries(formValues).forEach(([classLabel, value]) => {
        updatePricing(classLabel, parseInt(String(value)) || 0);
      });

      // Update show time settings (LOCAL)
      localShowTimes.forEach(show => {
        updateShowTime(show.key, show);
      });

      // SAVE TO BACKEND
      console.log('[SETTINGS] Saving settings to backend...');
      await saveSettingsToBackend();
      console.log('[SETTINGS] Settings saved to backend successfully');

      hasChangesRef.current = false;
      setShowSaveButton(false);
      
      // Force a re-render of components that use pricing
      window.dispatchEvent(new CustomEvent('pricingUpdated', { 
        detail: { pricing: formValues } 
      }));
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    }
  }, [watchedPricing, localShowTimes, updatePricing, updateShowTime, overlapErrors, saveSettingsToBackend, hasChangesRef, setShowSaveButton]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults();
      // Reset form values to defaults
      Object.entries(pricing).forEach(([classLabel, value]) => {
        setValue(classLabel, value);
      });
      setLocalShowTimes(showTimes);
      hasChangesRef.current = false;
      setShowSaveButton(false);
    }
  }, [resetToDefaults, pricing, setValue, showTimes, hasChangesRef, setShowSaveButton]);

  // Error display
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => setError(null)} 
      />
    );
  }

  return (
    <SettingsErrorBoundary>
      <div className="h-full flex flex-col min-h-0 bg-gray-50/30">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-shrink-0 bg-white border-b border-gray-200/80">
            <TabsList className="grid w-full grid-cols-6 h-12 bg-transparent rounded-none p-0 gap-0 border-0">
              <TabsTrigger 
                value="overview" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="pricing" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Pricing
              </TabsTrigger>
              <TabsTrigger 
                value="showtimes" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Show Times
              </TabsTrigger>
              <TabsTrigger 
                value="movies" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Movies
              </TabsTrigger>
              <TabsTrigger 
                value="bookings" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Bookings
              </TabsTrigger>
              <TabsTrigger 
                value="printer" 
                className="relative text-sm font-semibold rounded-none border-b-[3px] border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50/30 data-[state=active]:to-transparent data-[state=active]:text-blue-700 data-[state=active]:shadow-none text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all duration-200 h-full px-4"
              >
                Printer
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
            <OverviewTab localShowTimes={localShowTimes} />
          </TabsContent>

          <TabsContent value="pricing" className="flex-1 min-h-0 mt-0">
            <PricingTab 
              register={register}
              showSaveButton={showSaveButton && activeTab === 'pricing'}
              onSave={handleSave}
              onCancel={() => {
                // Reset form to current pricing values using react-hook-form's reset
                reset(pricing, { keepDefaultValues: false });
                hasChangesRef.current = false;
                setShowSaveButton(false);
              }}
              hasErrors={overlapErrors.length > 0}
            />
          </TabsContent>

          <TabsContent value="showtimes" className="flex-1 min-h-0 mt-0 p-0">
            <ShowTimesTab
              localShowTimes={localShowTimes}
              originalShowTimes={showTimes}
              onShowTimeChange={handleShowTimeChange}
              onSaveShowTime={handleSaveShowTime}
              overlapErrors={overlapErrors}
            />
          </TabsContent>

          <TabsContent value="movies" className="flex-1 min-h-0 mt-0 p-0">
            <MoviesTab />
          </TabsContent>

          <TabsContent value="bookings" className="flex-1 min-h-0 mt-0 p-0">
            <BookingsTab />
          </TabsContent>

          <TabsContent value="printer" className="flex-1 min-h-0 mt-0 p-0">
            <PrinterTab />
          </TabsContent>
        </Tabs>

        {/* Global Save Button - Only show for tabs that don't have their own save mechanism AND have changes */}
        {showSaveButton && 
         activeTab !== 'pricing' && 
         activeTab !== 'showtimes' && 
         (isDirty || JSON.stringify(localShowTimes) !== JSON.stringify(showTimes)) && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleSave}
              className={`shadow-lg ${overlapErrors.length ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={overlapErrors.length > 0}
            >
              <Save className="w-4 h-4 mr-2" />
              {overlapErrors.length ? 'Resolve Overlaps to Save' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </SettingsErrorBoundary>
  );
};

export default Settings;
