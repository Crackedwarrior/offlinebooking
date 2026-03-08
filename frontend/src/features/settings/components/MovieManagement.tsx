/**
 * MovieManagement Component
 * Main orchestrator for movie management
 * 
 * Refactored: Extracted logic into hooks and UI components
 * See: hooks/movie/, components/movies/
 */

import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, Plus } from 'lucide-react';
import { useMovieForm } from '@/hooks/movie/useMovieForm';
import { useMovieOperations } from '@/hooks/movie/useMovieOperations';
import { MovieForm } from '@/components/movies/MovieForm';
import { MovieList } from '@/components/movies/MovieList';

const MovieManagement = () => {
  const { saveSettingsToBackend } = useSettingsStore();
  
  const {
    movieForm,
    editingMovie,
    isAddingMovie,
    setMovieForm,
    setEditingMovie,
    setIsAddingMovie,
    resetForm,
    startEditing,
    updateFormField,
    updateShowAssignment,
    validateForm
  } = useMovieForm();

  const {
    movies,
    getMovieForShow,
    getMoviesForShow,
    handleAddMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleToggleShowAssignment
  } = useMovieOperations();

  const handleAdd = async () => {
    if (!validateForm()) return;
    
    const success = await handleAddMovie(movieForm);
    if (success) {
      resetForm();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMovie || !validateForm()) return;
    
    const success = await handleUpdateMovie(editingMovie.id, movieForm);
    if (success) {
      resetForm();
    }
  };

  const handleDelete = async (movie: any) => {
    await handleDeleteMovie(movie);
  };

  const handleShowAssignmentChange = (showKey: string, checked: boolean, getMovieForShowFn: (key: string) => any) => {
    updateShowAssignment(showKey, checked);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-white border-0 shadow-lg relative overflow-hidden w-full h-full rounded-none">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 text-white p-5 shadow-lg border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  WEEKLY MOVIE SCHEDULE
                </p>
                <p className="text-sm text-blue-100 font-normal leading-tight">
                  Add, edit, and manage movies in your library, then assign them to specific show times (Morning, Matinee, Evening, Night) for weekly scheduling
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-0 py-0 overflow-hidden">
          <div className="flex flex-col min-h-0 w-full px-6 pt-4 space-y-6">
            {/* Add Movie Button */}
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="font-semibold text-gray-800">Movies ({movies.length})</h3>
              <Button 
                onClick={() => setIsAddingMovie(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Add Movie
              </Button>
            </div>

            {/* Add Movie Form */}
            {isAddingMovie && (
              <MovieForm
                movieForm={movieForm}
                editingMovie={null}
                isAdding={true}
                onFormChange={updateFormField}
                onShowAssignmentChange={handleShowAssignmentChange}
                onSave={handleAdd}
                onCancel={() => setIsAddingMovie(false)}
                getMovieForShow={getMovieForShow}
              />
            )}

            {/* Movies List */}
            <MovieList
              movies={movies}
              editingMovie={editingMovie}
              movieForm={movieForm}
              getMovieForShow={getMovieForShow}
              onEdit={startEditing}
              onDelete={handleDelete}
              onToggleShowAssignment={handleToggleShowAssignment}
              onFormChange={updateFormField}
              onShowAssignmentChange={handleShowAssignmentChange}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingMovie(null)}
              saveSettingsToBackend={saveSettingsToBackend}
            />

          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MovieManagement;
