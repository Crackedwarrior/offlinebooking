/**
 * Movies Tab Component
 * Extracted from Settings.tsx
 */

import React from 'react';
import MovieManagement from '../components/MovieManagement';

export const MoviesTab: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <MovieManagement />
    </div>
  );
};

