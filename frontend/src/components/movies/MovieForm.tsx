/**
 * MovieForm Component
 * Form for adding/editing movies
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Save, X } from 'lucide-react';
import { SHOW_TIMES } from '@/lib/config';
import { MovieSettings } from '@/store/settingsStore';

interface MovieFormProps {
  movieForm: any;
  editingMovie: MovieSettings | null;
  isAdding: boolean;
  onFormChange: (field: string, value: any) => void;
  onShowAssignmentChange: (showKey: string, checked: boolean, getMovieForShow: (key: string) => MovieSettings | undefined) => void;
  onSave: () => void;
  onCancel: () => void;
  getMovieForShow: (key: string) => MovieSettings | undefined;
}

export const MovieForm: React.FC<MovieFormProps> = ({
  movieForm,
  editingMovie,
  isAdding,
  onFormChange,
  onShowAssignmentChange,
  onSave,
  onCancel,
  getMovieForShow
}) => {
  const formIdPrefix = editingMovie ? `edit-${editingMovie.id}-` : 'add-';

  return (
    <Card className="border-2 border-dashed border-blue-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${formIdPrefix}movie-name`}>Movie Name *</Label>
              <Input
                id={`${formIdPrefix}movie-name`}
                value={movieForm.name}
                onChange={(e) => onFormChange('name', e.target.value)}
                placeholder="Enter movie name"
              />
            </div>
            <div>
              <Label htmlFor={`${formIdPrefix}movie-language`}>Language *</Label>
              <Input
                id={`${formIdPrefix}movie-language`}
                value={movieForm.language}
                onChange={(e) => onFormChange('language', e.target.value)}
                placeholder="e.g., HINDI, ENGLISH"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`${formIdPrefix}print-kannada`}
              checked={movieForm.printInKannada}
              onChange={(e) => onFormChange('printInKannada', e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <Label htmlFor={`${formIdPrefix}print-kannada`} className="text-sm font-medium">
              Print tickets in Kannada for this movie
            </Label>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Which shows will this movie play in?</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {SHOW_TIMES.map((show) => (
                <div key={show.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${formIdPrefix}${show.key}`}
                    checked={movieForm.showAssignments[show.key as keyof typeof movieForm.showAssignments]}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const existingMovie = getMovieForShow(show.key);
                        if (existingMovie && (!editingMovie || existingMovie.id !== editingMovie.id)) {
                          return; // Conflict - don't allow
                        }
                      }
                      onShowAssignmentChange(show.key, e.target.checked, getMovieForShow);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor={`${formIdPrefix}${show.key}`} className="text-sm font-medium">
                    {show.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select multiple shows if needed
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave}>
              <Save className="w-4 h-4 mr-1" />
              {isAdding ? 'Add Movie' : 'Save'}
            </Button>
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

