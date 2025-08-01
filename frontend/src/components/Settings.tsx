import React, { useState } from 'react';
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
        description: 'All settings have been reset to their default values.',
      });
    }
  };

  // Calculate seat counts for overview
  const calculateSeatCounts = () => {
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
  };

  const seatCounts = calculateSeatCounts();
  const totalSeats = Object.values(seatCounts).reduce((sum, count) => sum + count, 0);

  const OverviewTab = () => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalSeats}</div>
              <div className="text-sm text-gray-600">Total Seats</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{SEAT_CLASSES.length}</div>
              <div className="text-sm text-gray-600">Seat Classes</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{showTimes.filter(s => s.enabled).length}</div>
              <div className="text-sm text-gray-600">Active Shows</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Class Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seat Class Summary
          </CardTitle>
          <CardDescription>
            Breakdown of seats by class and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SEAT_CLASSES.map(seatClass => (
              <div key={seatClass.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${seatClass.color}`}></div>
                  <div>
                    <div className="font-medium">{seatClass.label}</div>
                    <div className="text-sm text-gray-600">{seatClass.rows.join(', ')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">₹{pricing[seatClass.label] || seatClass.price}</div>
                  <div className="text-sm text-gray-600">{seatCounts[seatClass.label]} seats</div>
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
            {showTimes.map(show => (
              <div key={show.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{show.label}</div>
                  <div className="text-sm text-gray-600">{show.startTime} - {show.endTime}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={show.enabled ? "default" : "secondary"}>
                    {show.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common settings operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PricingTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Seat Pricing Configuration
          </CardTitle>
          <CardDescription>
            Set pricing for different seat classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SEAT_CLASSES.map(seatClass => (
              <div key={seatClass.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${seatClass.color}`}></div>
                  <div>
                    <div className="font-medium">{seatClass.label}</div>
                    <div className="text-sm text-gray-600">{seatCounts[seatClass.label]} seats</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`price-${seatClass.key}`} className="text-sm">₹</Label>
                  <Input
                    id={`price-${seatClass.key}`}
                    type="number"
                    value={localPricing[seatClass.label] || seatClass.price}
                    onChange={(e) => handlePricingChange(seatClass.label, e.target.value)}
                    className="w-24"
                    min="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ShowTimesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Show Time Configuration
          </CardTitle>
          <CardDescription>
            Configure show times and their availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {localShowTimes.map(show => (
              <div key={show.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{show.label}</h3>
                    <p className="text-sm text-gray-600">{show.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enabled-${show.key}`} className="text-sm">Enabled</Label>
                    <Switch
                      id={`enabled-${show.key}`}
                      checked={show.enabled}
                      onCheckedChange={(checked) => handleShowTimeChange(show.key, 'enabled', checked)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`start-${show.key}`}>Start Time</Label>
                    <SimpleTimePicker
                      value={show.startTime}
                      onChange={(time) => handleShowTimeChange(show.key, 'startTime', time)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`end-${show.key}`}>End Time</Label>
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
  );

  const MoviesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Movie Management
          </CardTitle>
          <CardDescription>
            Manage movies and their show assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovieManagement />
        </CardContent>
      </Card>
    </div>
  );

  const BookingsTab = () => (
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
  );

  const LayoutTab = () => (
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
  );

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