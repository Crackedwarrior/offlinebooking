import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSettingsStore, ShowTimeSettings } from '@/store/settingsStore';
import MovieManagement from './MovieManagement';
import SeatLayoutManager from './SeatLayoutManager';
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
  Grid3X3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SimpleTimePicker } from './SimpleTimePicker';
import BookingManagement from './BookingManagement';

type SettingsTab = 'overview' | 'pricing' | 'showtimes' | 'movies' | 'bookings' | 'layout';

const Settings = () => {
  const { pricing, showTimes, updatePricing, updateShowTime, resetToDefaults } = useSettingsStore();
  const [localPricing, setLocalPricing] = useState(pricing);
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');

  // Memoize the dirty check to prevent infinite re-renders
  const checkDirty = useCallback(() => {
    const pricingChanged = JSON.stringify(localPricing) !== JSON.stringify(pricing);
    const showTimesChanged = JSON.stringify(localShowTimes) !== JSON.stringify(showTimes);
    setIsDirty(pricingChanged || showTimesChanged);
  }, [localPricing, localShowTimes, pricing, showTimes]);

  // Use useEffect to check dirty state when dependencies change
  useEffect(() => {
    checkDirty();
  }, [checkDirty]);

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

  // Handle pricing changes
  const handlePricingChange = useCallback((classLabel: string, value: string) => {
    const price = parseInt(value) || 0;
    setLocalPricing(prev => ({ ...prev, [classLabel]: price }));
  }, []);

  // Handle show time changes
  const handleShowTimeChange = useCallback((key: string, field: keyof ShowTimeSettings, value: string | boolean) => {
    setLocalShowTimes(prev => prev.map(show => 
      show.key === key ? { ...show, [field]: value } : show
    ));
  }, []);

  // Save all changes
  const handleSave = useCallback(() => {
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
  }, [localPricing, localShowTimes, updatePricing, updateShowTime]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults();
      setLocalPricing(pricing);
      setLocalShowTimes(showTimes);
      setIsDirty(false);
      toast({
        title: 'Settings Reset',
        description: 'All settings have been reset to their default values.',
      });
    }
  }, [resetToDefaults, pricing, showTimes]);

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
                      <p className="text-sm text-gray-600">{show.startTime} - {show.endTime}</p>
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

  const PricingTab = useMemo(() => () => (
    <div className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SEAT_CLASSES.map(seatClass => (
              <div key={seatClass.label} className="space-y-4">
                <div>
                  <Label htmlFor={seatClass.label} className="text-base font-medium">
                    {seatClass.label}
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    {seatClass.rows.join(', ')}
                  </p>
                </div>
                <Input
                  id={seatClass.label}
                  type="number"
                  value={localPricing[seatClass.label] || 0}
                  onChange={(e) => handlePricingChange(seatClass.label, e.target.value)}
                  placeholder="Enter price"
                  min="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [localPricing, handlePricingChange]);

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
                    <p className="text-sm text-gray-600">{show.startTime} - {show.endTime}</p>
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

  const LayoutTab = useMemo(() => () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Seat Layout Management
          </CardTitle>
          <CardDescription>
            Configure and manage theater seat layouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeatLayoutManager />
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
          <TabsTrigger value="layout">Layout</TabsTrigger>
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

        <TabsContent value="layout" className="mt-6">
          <LayoutTab />
        </TabsContent>
      </Tabs>

      {/* Global Save Button */}
      {isDirty && (
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