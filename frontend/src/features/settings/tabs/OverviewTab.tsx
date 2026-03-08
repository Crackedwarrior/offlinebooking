/**
 * Overview Tab Component
 * Enterprise-grade dashboard with optimized design and accessibility
 */

import React, { useMemo, memo } from 'react';
import { 
  Film, 
  Clock, 
  Users, 
  BarChart3,
  Crown,
  Star,
  Sparkles,
  DollarSign,
  Calendar
} from 'lucide-react';
import { SEAT_CLASSES, SHOW_TIMES } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateSeatCounts, calculateTotalSeats } from '../utils/seatCalculations';
import { usePricing } from '@/hooks/use-pricing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OverviewTabProps {
  localShowTimes: ReturnType<typeof useSettingsStore>['showTimes'];
}

// Unified stat card with same height and subtle design - updated for amber/orange theme
const StatCard = memo<{
  label: string;
  value: number | string;
  color: 'amber' | 'orange' | 'red';
  icon: React.ReactNode;
}>(({ label, value, color, icon }) => {
  const colorConfig = {
    amber: {
      text: 'text-amber-700',
      value: 'text-amber-900',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    orange: {
      text: 'text-orange-700',
      value: 'text-orange-900',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    red: {
      text: 'text-red-700',
      value: 'text-red-900',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
  };

  const config = colorConfig[color];

  return (
    <div className="h-28 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-2 ${config.text} uppercase tracking-wide`}>{label}</p>
          <p className={`text-2xl font-bold leading-none ${config.value}`}>{value}</p>
        </div>
        <div className={`flex-shrink-0 w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center ml-3 opacity-60`}>
          <div className={config.iconColor}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

// Compact pill-style chip for seat classes
const SeatClassChip = memo<{ label: string; count: number }>(({ label, count }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
    <span className="text-sm font-semibold text-gray-900">{label}</span>
    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
      {count} seats
    </span>
  </div>
));
SeatClassChip.displayName = 'SeatClassChip';

// Compact pricing item
const PricingItem = memo<{ label: string; price: number; seatCount: number; icon: React.ReactNode }>(({ label, price, seatCount, icon }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg min-h-[72px]">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center opacity-60">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-900 block">{label}</span>
        <span className="text-xs text-gray-500 font-normal">Active Price</span>
      </div>
    </div>
    <div className="flex items-baseline gap-1 ml-3">
      <span className="text-base font-bold text-gray-900">₹</span>
      <span className="text-lg font-bold text-gray-900 tabular-nums">{price.toLocaleString('en-IN')}</span>
      <span className="text-xs text-gray-500 ml-1">({seatCount})</span>
    </div>
  </div>
));
PricingItem.displayName = 'PricingItem';

// Compact show time item
const ShowTimeItem = memo<{ label: string; startTime: string; endTime: string }>(({ label, startTime, endTime }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
    <div className="flex-1 min-w-0">
      <span className="text-sm font-semibold text-gray-900 block leading-tight">{label}</span>
      <p className="text-xs text-gray-600 mt-0.5 font-normal">{startTime} - {endTime}</p>
    </div>
    <span className="ml-3 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full whitespace-nowrap">
      Active
    </span>
  </div>
));
ShowTimeItem.displayName = 'ShowTimeItem';

// Icon mapping for pricing
const getSeatClassIcon = (label: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'BOX': <Crown className="w-4 h-4 text-gray-500" />,
    'STAR CLASS': <Star className="w-4 h-4 text-gray-500" />,
    'CLASSIC': <Film className="w-4 h-4 text-gray-500" />,
    'FIRST CLASS': <Sparkles className="w-4 h-4 text-gray-500" />,
    'SECOND CLASS': <Users className="w-4 h-4 text-gray-500" />,
  };
  return iconMap[label] || <DollarSign className="w-4 h-4 text-gray-400" />;
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ localShowTimes }) => {
  const { movies, showTimes, getMoviesForShow } = useSettingsStore();
  const { pricing } = usePricing();

  // Memoize all calculations
  const seatCounts = useMemo(() => calculateSeatCounts(), []);
  const totalSeats = useMemo(() => calculateTotalSeats(seatCounts), [seatCounts]);
  const enabledShowTimesCount = useMemo(() => showTimes.filter(s => s.enabled).length, [showTimes]);
  const activeShowTimes = useMemo(() => localShowTimes.filter(show => show.enabled), [localShowTimes]);
  const seatEntries = useMemo(() => Object.entries(seatCounts), [seatCounts]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-white border-0 shadow-lg relative overflow-hidden w-full h-full rounded-none">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white p-5 shadow-lg border-b border-amber-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  SYSTEM OVERVIEW
                </p>
                <p className="text-sm text-amber-100 font-normal leading-tight">
                  Monitor your system configuration, seat distribution, pricing, show times, and movie schedules in one comprehensive dashboard
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-0 py-0 overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Unified Stats Grid */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0 px-6 pt-4 pb-4">
              <StatCard
                label="Total Seats"
                value={totalSeats}
                color="amber"
                icon={<Users className="w-5 h-5" />}
              />
              <StatCard
                label="Show Times"
                value={enabledShowTimesCount}
                color="orange"
                icon={<Clock className="w-5 h-5" />}
              />
              <StatCard
                label="Movies"
                value={movies.length}
                color="red"
                icon={<Film className="w-5 h-5" />}
              />
            </div>
            
            {/* Two Column Grid - Side by Side */}
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-0 border-t border-gray-200">
              {/* Current Pricing */}
              <div className="flex flex-col min-h-0 bg-white border-r border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Current Pricing</h3>
                </div>
                <div className="flex-1 min-h-0 space-y-3 overflow-hidden">
                  {SEAT_CLASSES.map((seatClass) => {
                    const price = pricing[seatClass.label] || 0;
                    const seatCount = seatCounts[seatClass.label] || 0;
                    return (
                      <PricingItem
                        key={seatClass.label}
                        label={seatClass.label}
                        price={price}
                        seatCount={seatCount}
                        icon={getSeatClassIcon(seatClass.label)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* This Week's Movie Schedule */}
              <div className="flex flex-col min-h-0 bg-white p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Movie Schedule
                </h3>
                <div className="flex-1 min-h-0 space-y-3 overflow-hidden">
                  {SHOW_TIMES.map((show) => {
                    const moviesForShow = getMoviesForShow(show.key);
                    const showTime = activeShowTimes.find(s => s.key === show.key);
                    
                    return (
                      <div key={show.key} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700">{show.label} Show</h4>
                          {showTime && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-600">{showTime.startTime} - {showTime.endTime}</span>
                              <span className="text-[9px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">Active</span>
                            </div>
                          )}
                        </div>
                        {moviesForShow.length > 0 ? (
                          <div className="space-y-1.5">
                            {moviesForShow.map(movie => (
                              <div key={movie.id} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-gray-900 block truncate">{movie.name}</span>
                                  <span className="text-xs text-gray-500">({movie.language})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                            <span className="text-xs font-medium">No movie assigned</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

