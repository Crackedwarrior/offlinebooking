import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSettingsStore, ShowTimeSettings } from '@/store/settingsStore';
import MovieManagement from './MovieManagement';
import { SettingsErrorBoundary } from './SpecializedErrorBoundaries';

import { SEAT_CLASSES } from '@/lib/config';
import { seatsByRow } from '@/lib/seatMatrix';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Save, 
  Film, 
  DollarSign, 
  Clock, 
  Users, 
  BarChart3,
  Calendar,
  Trash2
} from 'lucide-react';
// import { toast } from '@/hooks/use-toast';
import BookingManagement from './BookingManagement';
import PriceDisplay from './PriceDisplay';

import PrinterConfig from './PrinterConfig';

type SettingsTab = 'overview' | 'pricing' | 'showtimes' | 'movies' | 'bookings' | 'printer';


const Settings = () => {
  // Removed debug render counting - performance optimization
  const { pricing, showTimes, movies, updatePricing, updateShowTime, addShowTime, deleteShowTime, resetToDefaults } = useSettingsStore();
  const [localShowTimes, setLocalShowTimes] = useState(showTimes);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapErrors, setOverlapErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const hasChangesRef = useRef(false);


  // React Hook Form for pricing
  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: pricing || {}
  });

  // Watch all pricing fields for changes
  const watchedPricing = watch();

  // Simple function to check if there are any changes
  const hasChanges = () => {
    const pricingChanged = isDirty;
    const showTimesChanged = JSON.stringify(localShowTimes) !== JSON.stringify(showTimes);
    return pricingChanged || showTimesChanged;
  };

  // Monitor changes and show save button
  useEffect(() => {
    const hasAnyChanges = hasChanges();
    if (hasAnyChanges) {
      setShowSaveButton(true);
      hasChangesRef.current = true;
    }
  }, [isDirty, localShowTimes, showTimes]);

  // --- Overlap Validation ---
  const parseToMinutes = useCallback((raw: string) => {
    // Accept formats like "H:MM", "HH:MM", and "H:MM AM/PM"
    if (!raw) return 0;
    const parts = raw.trim().split(' ');
    const timePart = parts[0];
    const ampm = (parts[1] || '').toUpperCase();
    const [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }, []);

  const expandIntervals = useCallback((startMin: number, endMin: number): Array<{ from: number; to: number }> => {
    // If end < start, treat as overnight by splitting into [start, 1440) and [0, end)
    if (endMin < startMin) {
      return [
        { from: startMin, to: 1440 },
        { from: 0, to: endMin }
      ];
    }
    return [{ from: startMin, to: endMin }];
  }, []);

  const computeOverlapErrors = useCallback((shows: ShowTimeSettings[]) => {
    const enabled = shows.filter(s => s.enabled);
    const intervals: Array<{ key: string; label: string; span: { from: number; to: number } } > = [];
    enabled.forEach(s => {
      const start = parseToMinutes(s.startTime);
      const end = parseToMinutes(s.endTime);
      const spans = expandIntervals(start, end);
      spans.forEach(span => intervals.push({ key: s.key, label: s.label, span }));
    });

    const conflicts: string[] = [];
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i];
        const b = intervals[j];
        const overlap = Math.max(0, Math.min(a.span.to, b.span.to) - Math.max(a.span.from, b.span.from));
        if (overlap > 0) conflicts.push(`${a.label} overlaps ${b.label}`);
      }
    }
    return Array.from(new Set(conflicts));
  }, [parseToMinutes, expandIntervals]);

  const recomputeOverlaps = useCallback(() => {
    setOverlapErrors(computeOverlapErrors(localShowTimes));
  }, [localShowTimes, computeOverlapErrors]);

  useEffect(() => {
    recomputeOverlaps();
  }, [recomputeOverlaps]);

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



  // Handle show time changes
  const handleShowTimeChange = useCallback((key: string, field: keyof ShowTimeSettings, value: string | boolean) => {
    setLocalShowTimes(prev => {
      const next = prev.map(show => show.key === key ? { ...show, [field]: value } : show);
      // Immediate validation using updated array to avoid stale state timing
      setOverlapErrors(computeOverlapErrors(next));
      return next;
    });
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, [computeOverlapErrors]);

  // Handle adding new show time
  const handleAddShowTime = useCallback(() => {
    const newShowTime: ShowTimeSettings = {
      key: `SHOW_${Date.now()}`, // Generate unique key
      label: 'New Show',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      enabled: true
    };

    addShowTime(newShowTime);
    setLocalShowTimes(prev => {
      const next = [...prev, newShowTime];
      setOverlapErrors(computeOverlapErrors(next));
      return next;
    });
    
    // Track changes and show save button
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, [addShowTime, computeOverlapErrors]);


  // Handle deleting show time
  const handleDeleteShowTime = useCallback((key: string) => {
    if (localShowTimes.length <= 1) {
      setError('Cannot delete the last show time');
      return;
    }

    deleteShowTime(key);
    setLocalShowTimes(prev => {
      const next = prev.filter(show => show.key !== key);
      setOverlapErrors(computeOverlapErrors(next));
      return next;
    });
    
    // Track changes and show save button
    hasChangesRef.current = true;
    setShowSaveButton(true);
  }, [localShowTimes, deleteShowTime, computeOverlapErrors]);

  // Save all changes
  const handleSave = useCallback(() => {
    try {
      if (overlapErrors.length > 0) {
        setError('Please resolve overlapping show times before saving.');
        return;
      }
      // Get current form values
      const formValues = watchedPricing;
      
      // Update pricing settings
      Object.entries(formValues).forEach(([classLabel, value]) => {
        updatePricing(classLabel, parseInt(String(value)) || 0);
      });

      // Update show time settings
      localShowTimes.forEach(show => {
        updateShowTime(show.key, show);
      });

      hasChangesRef.current = false;
      setShowSaveButton(false);
      
      // Show success message
      // Force a re-render of components that use pricing
      window.dispatchEvent(new CustomEvent('pricingUpdated', { 
        detail: { pricing: formValues } 
      }));
      
      // toast({
      //   title: 'Settings Saved',
      //   description: 'Your pricing and show time settings have been updated.',
      // });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    }
  }, [watchedPricing, localShowTimes, updatePricing, updateShowTime, overlapErrors]);

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
      // toast({
      //   title: 'Settings Reset',
      //   description: 'All settings have been reset to their default values.',
      // });
    }
  }, [resetToDefaults, pricing, setValue, showTimes]);

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
                  <p className="text-2xl font-bold text-orange-800">{movies.length}</p>
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
                <div key={seatClass.label} className="space-y-4">
                  <div>
                    <Label htmlFor={seatClass.label} className="text-base font-medium">
                      {seatClass.label}
                    </Label>
                  </div>
                  <input
                    {...register(seatClass.label, {
                      setValueAs: (value) => {
                        // Handle different value types
                        if (typeof value === 'number') {
                          return value;
                        }
                        if (typeof value === 'string') {
                          const cleanValue = value.replace(/[^0-9]/g, '');
                          return cleanValue === '' ? 0 : parseInt(cleanValue) || 0;
                        }
                        return 0;
                      }
                    })}
                    type="text"
                    placeholder="Enter price"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <PriceDisplay />
      </div>
    </div>
  ), [register]);

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
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Show Times ({localShowTimes.length})</h3>
            <Button
              onClick={handleAddShowTime}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              Add Show Time
            </Button>
          </div>

          {overlapErrors.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <div className="font-semibold mb-1">Overlapping show times detected</div>
              <ul className="list-disc pl-5 space-y-1">
                {overlapErrors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Existing Show Times */}
          <div className="space-y-6">
            {localShowTimes.map(show => (
              <div key={show.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{show.label}</h3>
                    <p className="text-sm text-gray-600">{show.startTime} - {show.endTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                  <Switch
                    checked={show.enabled}
                    onCheckedChange={(checked) => handleShowTimeChange(show.key, 'enabled', checked)}
                  />
                    {localShowTimes.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteShowTime(show.key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`${show.key}-start`}>Start Time</Label>
                    <div className="flex gap-1 items-center">
                      <select
                        value={show.startTime ? parseInt(show.startTime.split(' ')[0].split(':')[0]) || 10 : 10}
                        onChange={(e) => {
                          const hours = e.target.value;
                          const minutes = show.startTime ? show.startTime.split(' ')[0].split(':')[1] || '00' : '00';
                          const ampm = show.startTime ? show.startTime.split(' ')[1] || 'AM' : 'AM';
                          handleShowTimeChange(show.key, 'startTime', `${hours}:${minutes} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <span className="text-gray-500">:</span>
                      <select
                        value={show.startTime ? show.startTime.split(' ')[0].split(':')[1] || '00' : '00'}
                        onChange={(e) => {
                          const minutes = e.target.value;
                          const hours = show.startTime ? show.startTime.split(' ')[0].split(':')[0] || '10' : '10';
                          const ampm = show.startTime ? show.startTime.split(' ')[1] || 'AM' : 'AM';
                          handleShowTimeChange(show.key, 'startTime', `${hours}:${minutes} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                      <select
                        value={show.startTime ? show.startTime.split(' ')[1] || 'AM' : 'AM'}
                        onChange={(e) => {
                          const ampm = e.target.value;
                          const timePart = show.startTime ? show.startTime.split(' ')[0] || '10:00' : '10:00';
                          handleShowTimeChange(show.key, 'startTime', `${timePart} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`${show.key}-end`}>End Time</Label>
                    <div className="flex gap-1 items-center">
                      <select
                        value={show.endTime ? parseInt(show.endTime.split(' ')[0].split(':')[0]) || 12 : 12}
                        onChange={(e) => {
                          const hours = e.target.value;
                          const minutes = show.endTime ? show.endTime.split(' ')[0].split(':')[1] || '00' : '00';
                          const ampm = show.endTime ? show.endTime.split(' ')[1] || 'PM' : 'PM';
                          handleShowTimeChange(show.key, 'endTime', `${hours}:${minutes} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <span className="text-gray-500">:</span>
                      <select
                        value={show.endTime ? show.endTime.split(' ')[0].split(':')[1] || '00' : '00'}
                        onChange={(e) => {
                          const minutes = e.target.value;
                          const hours = show.endTime ? show.endTime.split(' ')[0].split(':')[0] || '12' : '12';
                          const ampm = show.endTime ? show.endTime.split(' ')[1] || 'PM' : 'PM';
                          handleShowTimeChange(show.key, 'endTime', `${hours}:${minutes} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(minute => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                      <select
                        value={show.endTime ? show.endTime.split(' ')[1] || 'PM' : 'PM'}
                        onChange={(e) => {
                          const ampm = e.target.value;
                          const timePart = show.endTime ? show.endTime.split(' ')[0] || '12:00' : '12:00';
                          handleShowTimeChange(show.key, 'endTime', `${timePart} ${ampm}`);
                        }}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Per-show conflict hint */}
                {overlapErrors.some(e => e.includes(show.label)) && (
                  <div className="mt-2 text-xs text-red-700">
                    This show overlaps another enabled show. Adjust its time range.
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [localShowTimes, handleShowTimeChange, handleDeleteShowTime, overlapErrors]);

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
            Configure printer settings and test connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrinterConfig />
        </CardContent>
      </Card>
    </div>
  ), []);



  return (
    <SettingsErrorBoundary>
    <div className="p-6">
      <div className="mb-6">
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