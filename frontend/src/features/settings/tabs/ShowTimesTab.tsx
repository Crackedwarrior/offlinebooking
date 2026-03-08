/**
 * Show Times Tab Component
 * Extracted from Settings.tsx
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle } from 'lucide-react';
import type { ShowTimeSettings } from '@/store/settingsStore';
import { ShowTimeItem } from '../components/ShowTimeItem';

interface ShowTimesTabProps {
  localShowTimes: ShowTimeSettings[];
  originalShowTimes: ShowTimeSettings[];
  onShowTimeChange: (key: string, field: keyof ShowTimeSettings, value: string | boolean) => void;
  onSaveShowTime: (key: string) => void;
  overlapErrors: string[];
}

export const ShowTimesTab: React.FC<ShowTimesTabProps> = ({
  localShowTimes,
  originalShowTimes,
  onShowTimeChange,
  onSaveShowTime,
  overlapErrors
}) => {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-white border-0 shadow-lg relative overflow-hidden w-full h-full rounded-none">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-5 shadow-lg border-b border-violet-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  SHOW TIME CONFIGURATION
                </p>
                <p className="text-sm text-violet-100 font-normal leading-tight">
                  Configure show timings (Morning, Matinee, Evening, Night) with start and end times, enable or disable shows, and manage overlapping schedules
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-4 py-4 pb-20 overflow-y-auto hide-scrollbar">
          <div className="flex flex-col min-h-0 w-full">
            {/* Show Times Header */}
            <div className="flex justify-between items-center flex-shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800">Show Times</h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
                  {localShowTimes.length}
                </span>
              </div>
            </div>

            {/* Overlap Errors */}
            {overlapErrors.length > 0 && (
              <div className="rounded-lg border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-red-50/50 p-4 text-sm text-red-900 flex-shrink-0 shadow-sm mb-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold mb-2 text-red-800">Overlapping show times detected</div>
                    <ul className="list-disc pl-5 space-y-1 text-red-700">
                      {overlapErrors.map((msg, idx) => (
                        <li key={idx} className="text-sm">{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Show Times List */}
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              {localShowTimes.map((show, index) => {
                const originalShow = originalShowTimes.find(s => s.key === show.key) || show;
                return (
                  <ShowTimeItem
                    key={show.key}
                    show={show}
                    originalShow={originalShow}
                    onFieldChange={onShowTimeChange}
                    onSave={onSaveShowTime}
                    hasOverlap={overlapErrors.some(e => e.includes(show.label))}
                    index={index}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

