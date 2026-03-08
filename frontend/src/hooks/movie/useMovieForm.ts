/**
 * useMovieForm Hook
 * Handles movie form state and validation
 */

import { useState } from 'react';
import { MovieSettings } from '@/store/settingsStore';
import { SHOW_TIMES } from '@/lib/config';

const initialFormState = {
  name: '',
  language: '',
  screen: 'Screen 1',
  printInKannada: false,
  showAssignments: {
    MORNING: false,
    MATINEE: false,
    EVENING: false,
    NIGHT: false
  }
};

export const useMovieForm = () => {
  const [movieForm, setMovieForm] = useState(initialFormState);
  const [editingMovie, setEditingMovie] = useState<MovieSettings | null>(null);
  const [isAddingMovie, setIsAddingMovie] = useState(false);

  const resetForm = () => {
    setMovieForm(initialFormState);
    setEditingMovie(null);
    setIsAddingMovie(false);
  };

  const startEditing = (movie: MovieSettings) => {
    setEditingMovie(movie);
    setMovieForm({
      name: movie.name,
      language: movie.language,
      screen: movie.screen,
      printInKannada: movie.printInKannada || false,
      showAssignments: { ...movie.showAssignments }
    });
  };

  const updateFormField = (field: string, value: any) => {
    setMovieForm(prev => ({ ...prev, [field]: value }));
  };

  const updateShowAssignment = (showKey: string, checked: boolean) => {
    setMovieForm(prev => ({
      ...prev,
      showAssignments: {
        ...prev.showAssignments,
        [showKey]: checked
      }
    }));
  };

  const validateForm = (): boolean => {
    return !!(movieForm.name && movieForm.language);
  };

  return {
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
  };
};

