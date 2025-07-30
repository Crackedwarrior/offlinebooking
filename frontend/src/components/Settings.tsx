import React, { useState } from 'react';
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
import { Settings as SettingsIcon, Save, RotateCcw, Film, DollarSign, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SimpleTimePicker } from './SimpleTimePicker';
import BookingManagement from './BookingManagement';

const Settings = () => {
  console.log('Settings component rendering...');
  const { pricing, showTimes, updatePricing, updateShowTime, resetToDefaults } = useSettingsStore();
  const [localPricing, setLocalPricing] = useState(pricing);
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Check if any changes have been made
  const checkDirty = () => {
    const pricingChanged = JSON.stringify(localPricing) !== JSON.stringify(pricing);
    const showTimesChanged = JSON.stringify(localShowTimes) !== JSON.stringify(showTimes);
    setIsDirty(pricingChanged || showTimesChanged);
  };

  // Handle pricing changes
  const handlePricingChange = (classLabel: string, value: string) => {
    const price = parseInt(value) || 0;
    setLocalPricing(prev => ({ ...prev, [classLabel]: price }));
    checkDirty();
  };

  // Handle show time changes
  const handleShowTimeChange = (key: string, field: keyof ShowTimeSettings, value: string | boolean) => {
    setLocalShowTimes(prev => prev.map(show => 
      show.key === key ? { ...show, [field]: value } : show
    ));
    checkDirty();
  };

  // Save all changes
  const handleSave = () => {
    // Update pricing settings
    Object.entries(localPricing).forEach(([classLabel, price]) => {
      updatePricing(classLabel, price);
    });

    // Update show time settings
    localShowTimes.forEach(show => {
      updateShowTime(show.key, show);
    });

    setIsDirty(false);
    toast({
      title: 'Settings Saved',
      description: 'Your pricing and show time settings have been updated.',
    });
  };

  // Reset to defaults
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults();
      setLocalPricing(pricing);
      setLocalShowTimes(showTimes);
      setIsDirty(false);
      toast({
        title: 'Settings Reset',
        description: 'All settings have been reset to default values.',
      });
    }
  };

  // Calculate exact total seats and revenue potential from seatMatrix
  const calculateSeatCounts = () => {
    try {
      const byClass: Record<string, number> = {};
      let total = 0;
      
      SEAT_CLASSES.forEach(cls => {
        let classCount = 0;
        cls.rows.forEach(row => {
          if (seatsByRow[row]) {
            // Count only numeric values (actual seats), skip empty strings
            const seatCount = seatsByRow[row].filter((seat: any) => typeof seat === 'number').length;
            classCount += seatCount;
          }
        });
        byClass[cls.label] = classCount;
        total += classCount;
      });
      
      return { total, byClass };
    } catch (err) {
      console.error('Error calculating seat counts:', err);
      setError('Failed to calculate seat counts. Please try again.');
      return { total: 0, byClass: {} };
    }
  };

  const { total: totalSeats, byClass: seatsByClass } = calculateSeatCounts();

  const maxRevenue = SEAT_CLASSES.reduce((total, cls) => {
    const seatCount = seatsByClass[cls.label] || 0;
    return total + (seatCount * localPricing[cls.label]);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure movie details and ticket pricing</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Pricing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Overview
          </CardTitle>
          <CardDescription>
            Summary of current pricing configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-semibold text-gray-700">Total Seats</div>
              <div className="text-2xl font-bold text-blue-600">{totalSeats}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-semibold text-gray-700">Max Revenue</div>
              <div className="text-2xl font-bold text-green-600">₹{maxRevenue.toLocaleString()}</div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">Current Pricing:</div>
            {SEAT_CLASSES.map((cls) => (
              <div key={cls.label} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{cls.label}</span>
                <span className="font-semibold">₹{localPricing[cls.label]}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">Seats by Class:</div>
            {SEAT_CLASSES.map((cls) => (
              <div key={cls.label} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{cls.label}</span>
                <span className="font-semibold">{seatsByClass[cls.label] || 0} seats</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Ticket Pricing
          </CardTitle>
          <CardDescription>
            Set ticket prices for each seat class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEAT_CLASSES.map((cls) => (
              <div key={cls.label} className="space-y-2">
                <Label htmlFor={`price-${cls.key}`} className="text-sm font-medium">
                  {cls.label}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id={`price-${cls.key}`}
                    type="number"
                    min="0"
                    value={localPricing[cls.label]}
                    onChange={(e) => handlePricingChange(cls.label, e.target.value)}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {cls.rows.length} rows • {seatsByClass[cls.label] || 0} seats
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show Time Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Times
          </CardTitle>
                           <CardDescription>
                   Turn shows on/off and set their start and end times
                 </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localShowTimes.map((show) => (
              <div key={show.key} className="border rounded-lg p-4 space-y-3">
                                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Switch
                             checked={show.enabled}
                             onCheckedChange={(checked) => handleShowTimeChange(show.key, 'enabled', checked)}
                           />
                           <div>
                             <Label className="font-medium">{show.label}</Label>
                             <p className="text-xs text-gray-500 mt-1">
                               {show.key === 'MORNING' && 'Early morning shows (before noon)'}
                               {show.key === 'MATINEE' && 'Afternoon shows (2 PM - 5 PM)'}
                               {show.key === 'EVENING' && 'Evening shows (6 PM - 9 PM)'}
                               {show.key === 'NIGHT' && 'Late night shows (after 9 PM)'}
                             </p>
                           </div>
                         </div>
                         <Badge variant={show.enabled ? "default" : "secondary"}>
                           {show.enabled ? "Active" : "Disabled"}
                         </Badge>
                       </div>
                
                                       {show.enabled && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <SimpleTimePicker
                             value={show.startTime}
                             onChange={(value) => handleShowTimeChange(show.key, 'startTime', value)}
                             label="Start Time"
                             id={`start-${show.key}`}
                           />
                           <SimpleTimePicker
                             value={show.endTime}
                             onChange={(value) => handleShowTimeChange(show.key, 'endTime', value)}
                             label="End Time"
                             id={`end-${show.key}`}
                           />
                         </div>
                       )}
              </div>
            ))}
          </div>
          
          <Separator className="my-4" />
          
                           <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                   <p className="font-medium text-blue-800 mb-1">💡 Tips:</p>
                   <ul className="space-y-1 text-blue-700">
                     <li>• Turn off shows you don't want to offer</li>
                     <li>• Set start and end times for each show</li>
                     <li>• Use AM for morning times, PM for afternoon/evening</li>
                     <li>• Disabled shows won't appear in booking</li>
                   </ul>
                 </div>
        </CardContent>
      </Card>

      {/* Movie Management */}
      <MovieManagement />

      {/* Booking Management */}
      <BookingManagement />

      {/* Save Status */}
      {isDirty && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-yellow-800">
              You have unsaved changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 