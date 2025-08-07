import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore, ShowTimeSettings } from '@/store/settingsStore';
import MovieManagement from './MovieManagement';

import { SEAT_CLASSES } from '@/lib/config';
import { seatsByRow } from '@/lib/seatMatrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  Film, 
  DollarSign, 
  Clock, 
  Users, 
  BarChart3,
  Calendar,
  Trash2
} from 'lucide-react';
// import { toast } from '@/hooks/use-toast';
import { SimpleTimePicker } from './SimpleTimePicker';
import BookingManagement from './BookingManagement';
import PriceDisplay from './PriceDisplay';
import IsolatedPricingInput from './IsolatedPricingInput';
import PrinterConfig from './PrinterConfig';

type SettingsTab = 'overview' | 'pricing' | 'showtimes' | 'movies' | 'bookings' | 'printer';

// Helper function to convert 24-hour time to 12-hour format
const convertTo12Hour = (time24h: string): string => {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const Settings = () => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`🔍 Settings component rendering (render #${renderCount.current})`);
  const { pricing, showTimes, updatePricing, updateShowTime, resetToDefaults } = useSettingsStore();
  const [localPricing, setLocalPricing] = useState(pricing);
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const hasChangesRef = useRef(false);

  // Simple function to check if there are any changes
  const hasChanges = () => {
    const pricingChanged = JSON.stringify(localPricing) !== JSON.stringify(pricing);
    const showTimesChanged = JSON.stringify(localShowTimes) !== JSON.stringify(showTimes);
    return pricingChanged || showTimesChanged;
  };

  // Monitor changes and show save button
  useEffect(() => {
    const hasAnyChanges = hasChanges();
    console.log('🔍 Settings: Checking for changes:', hasAnyChanges);
    if (hasAnyChanges) {
      setShowSaveButton(true);
      hasChangesRef.current = true;
    }
  }, [localPricing, localShowTimes, pricing, showTimes]);

  // Memoize seat counts calculation
  const seatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    SEAT_CLASSES.forEach(seatClass => {
      let totalSeats = 0;
      seatClass.rows.forEach(row => {
        const rowSeats = seatsByRow[row];
        if (rowSeats) {
          totalSeats += rowSeats.filter(seat => typeof seat === 'number').length;
        }
      });
      counts[seatClass.label] = totalSeats;
    });
    
    return counts;
  }, []);

  const totalSeats = useMemo(() => 
    Object.values(seatCounts).reduce((sum, count) => sum + count, 0), 
    [seatCounts]
  );

  // Add error boundary
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Settings</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle pricing changes - track changes without updating state
  const handlePricingChange = useCallback((classLabel: string, value: number) => {
    console.log(`🔍 Settings: handlePricingChange called for ${classLabel} with value ${value}`);
    
    // Track changes and show save button
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, []);

  // Handle show time changes
  const handleShowTimeChange = useCallback((key: string, field: keyof ShowTimeSettings, value: string | boolean) => {
    console.log(`🔍 Settings: handleShowTimeChange called for ${key}.${field} with value ${value}`);
    
    setLocalShowTimes(prev => prev.map(show => 
      show.key === key ? { ...show, [field]: value } : show
    ));
    
    // Track changes and show save button
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, []);

  // Save all changes
  const handleSave = useCallback(() => {
    try {
      // Collect current values from input components and update pricing settings
      const updatedPricing: Record<string, number> = {};
      
      SEAT_CLASSES.forEach(seatClass => {
        // Get the current value from the input component
        const inputElement = document.getElementById(seatClass.label) as HTMLInputElement;
        if (inputElement) {
          const value = parseInt(inputElement.value) || 0;
          updatedPricing[seatClass.label] = value;
          updatePricing(seatClass.label, value);
        }
      });

      // Update show time settings
      localShowTimes.forEach(show => {
        updateShowTime(show.key, show);
      });

      hasChangesRef.current = false;
      setShowSaveButton(false);
      
      // Show success message
      console.log('✅ Settings saved successfully!');
      console.log('💰 Updated pricing:', updatedPricing);
      
      // Force a re-render of components that use pricing
      window.dispatchEvent(new CustomEvent('pricingUpdated', { 
        detail: { pricing: updatedPricing } 
      }));
      
      // toast({
      //   title: 'Settings Saved',
      //   description: 'Your pricing and show time settings have been updated.',
      // });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    }
  }, [localShowTimes, updatePricing, updateShowTime]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults();
      setLocalPricing(pricing);
      setLocalShowTimes(showTimes);
      hasChangesRef.current = false;
      setShowSaveButton(false);
      // toast({
      //   title: 'Settings Reset',
      //   description: 'All settings have been reset to their default values.',
      // });
    }
  }, [resetToDefaults, pricing, showTimes]);

  // Clear all data completely
  const handleClearAllData = useCallback(() => {
    if (window.confirm('This will clear ALL settings data including pricing. Are you sure? This action cannot be undone.')) {
      // Clear localStorage completely
      localStorage.removeItem('booking-settings');
      // Force page reload to reset everything
      window.location.reload();
    }
  }, []);

  // Memoize tab components to prevent remounting
  const OverviewTab = useMemo(() => () => (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            System Overview
          </CardTitle>
          <CardDescription>
            Current system configuration and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Seats</p>
                  <p className="text-2xl font-bold text-blue-800">{totalSeats}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Seat Classes</p>
                  <p className="text-2xl font-bold text-green-800">{SEAT_CLASSES.length}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Show Times</p>
                  <p className="text-2xl font-bold text-purple-800">{showTimes.filter(s => s.enabled).length}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Movies</p>
                  <p className="text-2xl font-bold text-orange-800">{localShowTimes.length}</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Film className="w-4 h-4 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Seat Distribution</h3>
              <div className="space-y-3">
                {Object.entries(seatCounts).map(([classLabel, count]) => (
                  <div key={classLabel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{classLabel}</span>
                    <Badge variant="secondary">{count} seats</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Show Times</h3>
              <div className="space-y-3">
                {localShowTimes.filter(show => show.enabled).map(show => (
                  <div key={show.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{show.label}</span>
                      <p className="text-sm text-gray-600">{convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ), [totalSeats, seatCounts, localShowTimes]);



  const PricingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Configuration
            </CardTitle>
            <CardDescription>
              Set pricing for different seat classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SEAT_CLASSES.map(seatClass => (
                <IsolatedPricingInput 
                  key={seatClass.label} 
                  seatClass={seatClass}
                  initialValue={localPricing[seatClass.label] || 0}
                  onValueChange={handlePricingChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <PriceDisplay />
      </div>
    </div>
  );

  const ShowTimesTab = useMemo(() => () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Time Configuration
          </CardTitle>
          <CardDescription>
            Configure show times and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {localShowTimes.map(show => (
              <div key={show.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{show.label}</h3>
                    <p className="text-sm text-gray-600">{convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}</p>
                  </div>
                  <Switch
                    checked={show.enabled}
                    onCheckedChange={(checked) => handleShowTimeChange(show.key, 'enabled', checked)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`${show.key}-start`}>Start Time</Label>
                    <SimpleTimePicker
                      value={show.startTime}
                      onChange={(time) => handleShowTimeChange(show.key, 'startTime', time)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${show.key}-end`}>End Time</Label>
                    <SimpleTimePicker
                      value={show.endTime}
                      onChange={(time) => handleShowTimeChange(show.key, 'endTime', time)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [localShowTimes, handleShowTimeChange]);

  const MoviesTab = useMemo(() => () => (
    <div className="space-y-6">
      <MovieManagement />
    </div>
  ), []);

  const BookingsTab = useMemo(() => () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Booking Management
          </CardTitle>
          <CardDescription>
            Manage booking settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingManagement />
        </CardContent>
      </Card>
    </div>
  ), []);

  const PrinterTab = useMemo(() => () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🖨️ Printer Configuration
          </CardTitle>
          <CardDescription>
            Configure Epson TM-T20 M249A POS printer settings and test connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrinterConfig />
        </CardContent>
      </Card>
    </div>
  ), []);



  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Configure system settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="showtimes">Show Times</TabsTrigger>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="printer">Printer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingTab />
        </TabsContent>

        <TabsContent value="showtimes" className="mt-6">
          <ShowTimesTab />
        </TabsContent>

        <TabsContent value="movies" className="mt-6">
          <MoviesTab />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <BookingsTab />
        </TabsContent>

        <TabsContent value="printer" className="mt-6">
          <PrinterTab />
        </TabsContent>

      </Tabs>

      {/* Global Save Button */}
      {showSaveButton && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}

    </div>
  );
};

export default Settings; 