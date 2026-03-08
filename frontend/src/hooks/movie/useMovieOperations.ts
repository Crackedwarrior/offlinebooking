/**
 * useMovieOperations Hook
 * Handles movie CRUD operations
 */

import { useSettingsStore, MovieSettings } from '@/store/settingsStore';

export const useMovieOperations = () => {
  const { 
    movies, 
    addMovie, 
    updateMovie, 
    deleteMovie, 
    updateShowAssignment,
    getMoviesForShow,
    saveSettingsToBackend
  } = useSettingsStore();

  const getMovieForShow = (showKey: string) => {
    return movies.find(movie => movie.showAssignments[showKey as keyof typeof movie.showAssignments]);
  };

  const handleAddMovie = async (movieForm: any) => {
    if (!movieForm.name || !movieForm.language) {
      return false;
    }

    const newMovie: MovieSettings = {
      id: `movie-${Date.now()}`,
      ...movieForm
    };

    addMovie(newMovie);
    await saveSettingsToBackend();
    return true;
  };

  const handleUpdateMovie = async (movieId: string, movieForm: any) => {
    if (!movieForm.name || !movieForm.language) {
      return false;
    }

    updateMovie(movieId, movieForm);
    await saveSettingsToBackend();
    return true;
  };

  const handleDeleteMovie = async (movie: MovieSettings) => {
    if (!window.confirm(`Are you sure you want to delete "${movie.name}"? This will also remove it from any shows it's assigned to.`)) {
      return false;
    }

    deleteMovie(movie.id);
    await saveSettingsToBackend();
    return true;
  };

  const handleToggleShowAssignment = async (movieId: string, showKey: string, assigned: boolean) => {
    updateShowAssignment(movieId, showKey, assigned);
    await saveSettingsToBackend();
  };

  return {
    movies,
    getMovieForShow,
    getMoviesForShow,
    handleAddMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleToggleShowAssignment
  };
};

