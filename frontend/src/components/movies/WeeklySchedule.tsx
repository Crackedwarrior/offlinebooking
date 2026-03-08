/**
 * WeeklySchedule Component
 * Displays weekly movie schedule by show
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { SHOW_TIMES } from '@/lib/config';
import { MovieSettings } from '@/store/settingsStore';

interface WeeklyScheduleProps {
  movies: MovieSettings[];
  getMoviesForShow: (showKey: string) => MovieSettings[];
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  movies,
  getMoviesForShow
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          This Week's Movie Schedule
        </CardTitle>
        <CardDescription>
          View of all movies playing in each show
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {SHOW_TIMES.map((show) => {
            const moviesForShow = getMoviesForShow(show.key);
            
            return (
              <div key={show.key} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{show.label} Show</h4>
                {moviesForShow.length > 0 ? (
                  <div className="space-y-2">
                    {moviesForShow.map(movie => (
                      <div key={movie.id} className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <span className="font-semibold text-lg">{movie.name}</span>
                          <span className="text-gray-500 ml-2">({movie.language})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">No movie assigned</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

