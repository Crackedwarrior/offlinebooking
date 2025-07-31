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
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SimpleTimePicker } from './SimpleTimePicker';
import BookingManagement from './BookingManagement';

type SettingsTab = 'overview' | 'pricing' | 'showtimes' | 'movies' | 'bookings';

const Settings = () => {
  console.log('Settings component rendering...');
  const { pricing, showTimes, updatePricing, updateShowTime, resetToDefaults } = useSettingsStore();
  const [localPricing, setLocalPricing] = useState(pricing);
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');

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

  // Overview Component
  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Settings Overview
          </h1>
          <p className="text-gray-600 mt-1">Quick summary of your current configuration</p>
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

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Seats</p>
                <p className="text-2xl font-bold text-blue-600">{totalSeats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Max Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{maxRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Shows</p>
                <p className="text-2xl font-bold text-purple-600">
                  {localShowTimes.filter(show => show.enabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Film className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Movies</p>
                <p className="text-2xl font-bold text-orange-600">
                  {useSettingsStore.getState().movies.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Summary
          </CardTitle>
          <CardDescription>
            Current pricing configuration for each seat class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {SEAT_CLASSES.map((cls) => (
              <div key={cls.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-gray-700">{cls.label}</span>
                  <span className="text-sm text-gray-500 ml-2">• {seatsByClass[cls.label] || 0} seats</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">₹{localPricing[cls.label]}</span>
                  <div className="text-xs text-gray-500">
                    Potential: ₹{(seatsByClass[cls.label] || 0) * localPricing[cls.label]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show Times Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Times Summary
          </CardTitle>
          <CardDescription>
            Current show time configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {localShowTimes.map((show) => (
              <div key={show.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-gray-700">{show.label}</span>
                  {show.enabled && (
                    <span className="text-sm text-gray-500 ml-2">
                      • {show.startTime} - {show.endTime}
                    </span>
                  )}
                </div>
                <Badge variant={show.enabled ? "default" : "secondary"}>
                  {show.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Pricing Tab Component
  const PricingTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Ticket Pricing
          </h1>
          <p className="text-gray-600 mt-1">Set ticket prices for each seat class</p>
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

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Set Prices
          </CardTitle>
          <CardDescription>
            Configure ticket prices for each seat class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SEAT_CLASSES.map((cls) => (
              <div key={cls.label} className="space-y-3 p-4 border rounded-lg">
                <div>
                  <Label htmlFor={`price-${cls.key}`} className="text-sm font-medium">
                    {cls.label}
                  </Label>
                  <div className="text-xs text-gray-500 mt-1">
                    {cls.rows.length} rows • {seatsByClass[cls.label] || 0} seats
                  </div>
                </div>
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
                <div className="text-sm text-gray-600">
                  Potential Revenue: ₹{(seatsByClass[cls.label] || 0) * localPricing[cls.label]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Revenue Summary
          </CardTitle>
          <CardDescription>
            Total revenue potential with current pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalSeats}</div>
              <div className="text-sm text-gray-600">Total Seats</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">₹{maxRevenue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Max Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show Times Tab Component
  const ShowTimesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Show Times
          </h1>
          <p className="text-gray-600 mt-1">Configure show schedules and timing</p>
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

      {/* Show Time Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Schedule
          </CardTitle>
          <CardDescription>
            Turn shows on/off and set their start and end times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localShowTimes.map((show) => (
              <div key={show.key} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={show.enabled}
                      onCheckedChange={(checked) => handleShowTimeChange(show.key, 'enabled', checked)}
                    />
                    <div>
                      <Label className="font-medium text-lg">{show.label}</Label>
                      <p className="text-sm text-gray-500 mt-1">
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
          
          <Separator className="my-6" />
          
          <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-md">
            <p className="font-medium text-blue-800 mb-2">💡 Tips:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Turn off shows you don't want to offer</li>
              <li>• Set start and end times for each show</li>
              <li>• Use AM for morning times, PM for afternoon/evening</li>
              <li>• Disabled shows won't appear in booking</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
            <p className="text-gray-600 mt-1">Manage your theater configuration</p>
          </div>
        </div>

        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="showtimes" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Show Times
          </TabsTrigger>
          <TabsTrigger value="movies" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            Movies
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <PricingTab />
        </TabsContent>

        <TabsContent value="showtimes" className="space-y-6">
          <ShowTimesTab />
        </TabsContent>

        <TabsContent value="movies" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Film className="w-6 h-6" />
                Movie Management
              </h1>
              <p className="text-gray-600 mt-1">Add, edit, and manage movies and show assignments</p>
            </div>
          </div>
          <MovieManagement />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Booking Management
              </h1>
              <p className="text-gray-600 mt-1">View and manage existing bookings</p>
            </div>
          </div>
          <BookingManagement />
        </TabsContent>
      </Tabs>

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