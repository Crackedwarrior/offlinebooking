/**
 * Show Time Item Component
 * Individual show time configuration item with editing capabilities
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, AlertCircle } from 'lucide-react';
import type { ShowTimeSettings } from '@/store/settingsStore';

interface ShowTimeItemProps {
  show: ShowTimeSettings;
  originalShow: ShowTimeSettings;
  onFieldChange: (key: string, field: keyof ShowTimeSettings, value: string | boolean) => void;
  onSave: (key: string) => void;
  hasOverlap: boolean;
  index: number;
}

export const ShowTimeItem: React.FC<ShowTimeItemProps> = ({
  show,
  originalShow,
  onFieldChange,
  onSave,
  hasOverlap,
  index
}) => {
  const hasChanges = JSON.stringify(show) !== JSON.stringify(originalShow);

  // Parse time string (e.g., "6:00 PM") to hours, minutes, and AM/PM
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      return {
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
        ampm: match[3].toUpperCase()
      };
    }
    return { hours: 12, minutes: 0, ampm: 'AM' };
  };

  // Format time from hours, minutes, and AM/PM
  const formatTime = (hours: number, minutes: number, ampm: string) => {
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const startTime = parseTime(show.startTime);
  const endTime = parseTime(show.endTime);

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${hasOverlap ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900">{show.label}</h4>
              {hasOverlap && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Overlap</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`${show.key}-enabled`} className="text-sm text-gray-700">
                Enabled
              </Label>
              <Switch
                id={`${show.key}-enabled`}
                checked={show.enabled}
                onCheckedChange={(checked) => onFieldChange(show.key, 'enabled', checked)}
              />
            </div>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor={`${show.key}-start`} className="text-sm font-medium text-gray-700">
                Start Time
              </Label>
              <div className="flex gap-2 items-center">
                <select
                  value={startTime.hours}
                  onChange={(e) => {
                    const newHours = parseInt(e.target.value);
                    const newTime = formatTime(newHours, startTime.minutes, startTime.ampm);
                    onFieldChange(show.key, 'startTime', newTime);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  value={startTime.minutes}
                  onChange={(e) => {
                    const newMinutes = parseInt(e.target.value);
                    const newTime = formatTime(startTime.hours, newMinutes, startTime.ampm);
                    onFieldChange(show.key, 'startTime', newTime);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 15, 30, 45].map(min => (
                    <option key={min} value={min}>{min.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={startTime.ampm}
                  onChange={(e) => {
                    const newTime = formatTime(startTime.hours, startTime.minutes, e.target.value);
                    onFieldChange(show.key, 'startTime', newTime);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor={`${show.key}-end`} className="text-sm font-medium text-gray-700">
                End Time
              </Label>
              <div className="flex gap-2 items-center">
                <select
                  value={endTime.hours}
                  onChange={(e) => {
                    const newHours = parseInt(e.target.value);
                    const newTime = formatTime(newHours, endTime.minutes, endTime.ampm);
                    onFieldChange(show.key, 'endTime', newTime);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  value={endTime.minutes}
                  onChange={(e) => {
                    const newMinutes = parseInt(e.target.value);
                    const newTime = formatTime(endTime.hours, newMinutes, endTime.ampm);
                    onFieldChange(show.key, 'endTime', newTime);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 15, 30, 45].map(min => (
                    <option key={min} value={min}>{min.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={endTime.ampm}
                  onChange={(e) => {
                    const newTime = formatTime(endTime.hours, endTime.minutes, e.target.value);
                    onFieldChange(show.key, 'endTime', newTime);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => onSave(show.key)}
                size="sm"
                disabled={hasOverlap}
                className={hasOverlap ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

