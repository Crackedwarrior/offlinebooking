/**
 * MovieList Component
 * Displays list of movies with edit/delete actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Edit, Trash2 } from 'lucide-react';
import { SHOW_TIMES } from '@/lib/config';
import { MovieSettings } from '@/store/settingsStore';

interface MovieListProps {
  movies: MovieSettings[];
  editingMovie: MovieSettings | null;
  movieForm: any;
  getMovieForShow: (showKey: string) => MovieSettings | undefined;
  onEdit: (movie: MovieSettings) => void;
  onDelete: (movie: MovieSettings) => void;
  onToggleShowAssignment: (movieId: string, showKey: string, assigned: boolean) => void;
  onFormChange: (field: string, value: any) => void;
  onShowAssignmentChange: (showKey: string, checked: boolean, getMovieForShowFn: (key: string) => any) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  saveSettingsToBackend: () => Promise<void>;
}

import { MovieForm } from './MovieForm';

export const MovieList: React.FC<MovieListProps> = ({
  movies,
  editingMovie,
  movieForm,
  getMovieForShow,
  onEdit,
  onDelete,
  onToggleShowAssignment,
  onFormChange,
  onShowAssignmentChange,
  onSaveEdit,
  onCancelEdit,
  saveSettingsToBackend
}) => {
  return (
    <div className="space-y-4">
      {movies.map((movie) => (
        <Card key={movie.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            {editingMovie?.id === movie.id ? (
              // Edit mode
              <MovieForm
                movieForm={movieForm}
                editingMovie={editingMovie}
                isAdding={false}
                onFormChange={onFormChange}
                onShowAssignmentChange={onShowAssignmentChange}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                getMovieForShow={getMovieForShow}
              />
            ) : (
              // Display mode
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{movie.name}</h4>
                    <p className="text-sm text-gray-600">{movie.language} • {movie.screen}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onEdit(movie)} size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => onDelete(movie)} size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">This movie plays in:</Label>
                  <div className="mt-2">
                    {(() => {
                      const assignedShows = SHOW_TIMES.filter(show => 
                        movie.showAssignments[show.key as keyof typeof movie.showAssignments]
                      );
                      
                      if (assignedShows.length === 0) {
                        return (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                            ⚠️ No show assigned - This movie won't be shown
                          </div>
                        );
                      }
                      
                      return assignedShows.map(show => (
                        <div key={show.key} className="flex items-center space-x-2 text-sm">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-700">
                            {show.label} Show
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Quick Toggle:</Label>
                    <div className="flex flex-wrap gap-2">
                      {SHOW_TIMES.map((show) => {
                        const currentAssignment = movie.showAssignments[show.key as keyof typeof movie.showAssignments];
                        const existingMovie = getMovieForShow(show.key);
                        const isConflict = existingMovie && existingMovie.id !== movie.id;
                        
                        return (
                          <button
                            key={show.key}
                            onClick={async () => {
                              if (currentAssignment) {
                                onToggleShowAssignment(movie.id, show.key, false);
                                await saveSettingsToBackend();
                              } else {
                                if (isConflict) {
                                  return;
                                }
                                onToggleShowAssignment(movie.id, show.key, true);
                                await saveSettingsToBackend();
                              }
                            }}
                            className={`px-3 py-1 text-xs rounded border ${
                              currentAssignment
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : isConflict
                                ? 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                            }`}
                            disabled={isConflict}
                          >
                            {currentAssignment ? 'Remove from' : isConflict ? 'Conflict' : 'Add to'} {show.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

