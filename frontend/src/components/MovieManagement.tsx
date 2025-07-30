import React, { useState } from 'react';
import { useSettingsStore, MovieSettings } from '@/store/settingsStore';
import { SHOW_TIMES } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Film, Plus, Edit, Trash2, Save, X, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MovieManagement = () => {
  const { 
    movies, 
    addMovie, 
    updateMovie, 
    deleteMovie, 
    updateShowAssignment,
    getMoviesForShow
  } = useSettingsStore();

  // Helper function to check if a show already has a movie assigned
  const getMovieForShow = (showKey: string) => {
    return movies.find(movie => movie.showAssignments[showKey as keyof typeof movie.showAssignments]);
  };

  const [editingMovie, setEditingMovie] = useState<MovieSettings | null>(null);
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [movieForm, setMovieForm] = useState({
    name: '',
    language: '',
    screen: 'Screen 1',
    showAssignments: {
      MORNING: false,
      MATINEE: false,
      EVENING: false,
      NIGHT: false
    }
  });

  const handleAddMovie = () => {
    if (!movieForm.name || !movieForm.language) {
      toast({
        title: 'Error',
        description: 'Movie name and language are required',
        variant: 'destructive',
      });
      return;
    }

    const newMovie: MovieSettings = {
      id: `movie-${Date.now()}`,
      ...movieForm
    };

    addMovie(newMovie);
    setIsAddingMovie(false);
    setMovieForm({
      name: '',
      language: '',
      screen: 'Screen 1',
      showAssignments: {
        MORNING: false,
        MATINEE: false,
        EVENING: false,
        NIGHT: false
      }
    });
    toast({
      title: 'Success',
      description: 'Movie added successfully',
    });
  };

  const handleEditMovie = (movie: MovieSettings) => {
    setEditingMovie(movie);
    setMovieForm({
      name: movie.name,
      language: movie.language,
      screen: movie.screen,
      showAssignments: { ...movie.showAssignments }
    });
  };

  const handleSaveEdit = () => {
    if (!editingMovie) return;

    if (!movieForm.name || !movieForm.language) {
      toast({
        title: 'Error',
        description: 'Movie name and language are required',
        variant: 'destructive',
      });
      return;
    }

    updateMovie(editingMovie.id, movieForm);
    setEditingMovie(null);
    setMovieForm({
      name: '',
      language: '',
      screen: 'Screen 1',
      showAssignments: {
        MORNING: false,
        MATINEE: false,
        EVENING: false,
        NIGHT: false
      }
    });
    toast({
      title: 'Success',
      description: 'Movie updated successfully',
    });
  };

  const handleDeleteMovie = (movie: MovieSettings) => {
    if (!window.confirm(`Are you sure you want to delete "${movie.name}"? This will also remove it from any shows it's assigned to.`)) {
      return;
    }

    deleteMovie(movie.id);
    toast({
      title: 'Success',
      description: 'Movie deleted successfully',
    });
  };



  return (
    <div className="space-y-6">
      {/* Weekly Movie Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Movie Schedule
          </CardTitle>
          <CardDescription>
            Manage movies and assign them to different shows for the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Movie Button */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Movies ({movies.length})</h3>
            <Button 
              onClick={() => setIsAddingMovie(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Movie
            </Button>
          </div>

          {/* Add Movie Form */}
          {isAddingMovie && (
            <Card className="border-2 border-dashed border-blue-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="movie-name">Movie Name *</Label>
                      <Input
                        id="movie-name"
                        value={movieForm.name}
                        onChange={(e) => setMovieForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter movie name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="movie-language">Language *</Label>
                      <Input
                        id="movie-language"
                        value={movieForm.language}
                        onChange={(e) => setMovieForm(prev => ({ ...prev, language: e.target.value }))}
                        placeholder="e.g., HINDI, ENGLISH"
                      />
                    </div>
                  </div>
                  
                                     {/* Show Assignment - Multiple Checkboxes */}
                   <div>
                     <Label className="text-sm font-medium">Which shows will this movie play in?</Label>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                       {SHOW_TIMES.map((show) => (
                         <div key={show.key} className="flex items-center space-x-2">
                           <input
                             type="checkbox"
                             id={`add-${show.key}`}
                             checked={movieForm.showAssignments[show.key as keyof typeof movieForm.showAssignments]}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 // Check if this show already has a movie assigned
                                 const existingMovie = getMovieForShow(show.key);
                                 if (existingMovie) {
                                   toast({
                                     title: 'Conflict',
                                     description: `${existingMovie.name} is already assigned to ${show.label} Show. Remove it first.`,
                                     variant: 'destructive',
                                   });
                                   return;
                                 }
                               }
                               
                               setMovieForm(prev => ({
                                 ...prev,
                                 showAssignments: {
                                   ...prev.showAssignments,
                                   [show.key]: e.target.checked
                                 }
                               }));
                             }}
                             className="w-4 h-4 text-blue-600"
                           />
                           <Label htmlFor={`add-${show.key}`} className="text-sm font-medium">
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
                    <Button onClick={handleAddMovie}>
                      <Save className="w-4 h-4 mr-1" />
                      Add Movie
                    </Button>
                    <Button onClick={() => setIsAddingMovie(false)} variant="outline">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movies Schedule Grid */}
          <div className="space-y-4">
            {movies.map((movie) => (
              <Card key={movie.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  {editingMovie?.id === movie.id ? (
                    // Edit Form
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-movie-name">Movie Name *</Label>
                          <Input
                            id="edit-movie-name"
                            value={movieForm.name}
                            onChange={(e) => setMovieForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-movie-language">Language *</Label>
                          <Input
                            id="edit-movie-language"
                            value={movieForm.language}
                            onChange={(e) => setMovieForm(prev => ({ ...prev, language: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                                             {/* Show Assignment for Edit - Multiple Checkboxes */}
                       <div>
                         <Label className="text-sm font-medium">Which shows will this movie play in?</Label>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                           {SHOW_TIMES.map((show) => (
                             <div key={show.key} className="flex items-center space-x-2">
                               <input
                                 type="checkbox"
                                 id={`edit-${movie.id}-${show.key}`}
                                 checked={movieForm.showAssignments[show.key as keyof typeof movieForm.showAssignments]}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     // Check if this show already has a movie assigned (excluding current movie)
                                     const existingMovie = getMovieForShow(show.key);
                                     if (existingMovie && existingMovie.id !== movie.id) {
                                       toast({
                                         title: 'Conflict',
                                         description: `${existingMovie.name} is already assigned to ${show.label} Show. Remove it first.`,
                                         variant: 'destructive',
                                       });
                                       return;
                                     }
                                   }
                                   
                                   setMovieForm(prev => ({
                                     ...prev,
                                     showAssignments: {
                                       ...prev.showAssignments,
                                       [show.key]: e.target.checked
                                     }
                                   }));
                                 }}
                                 className="w-4 h-4 text-blue-600"
                               />
                               <Label htmlFor={`edit-${movie.id}-${show.key}`} className="text-sm font-medium">
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
                        <Button onClick={handleSaveEdit}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button onClick={() => setEditingMovie(null)} variant="outline">
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display Movie with Show Assignments
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{movie.name}</h4>
                          <p className="text-sm text-gray-600">{movie.language} • {movie.screen}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditMovie(movie)} size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDeleteMovie(movie)} size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                                             {/* Show Assignment Display - Multiple Shows */}
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
                         
                         {/* Quick Toggle Buttons */}
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
                                   onClick={() => {
                                     if (currentAssignment) {
                                       // Removing from show
                                       updateShowAssignment(movie.id, show.key, false);
                                       toast({
                                         title: 'Success',
                                         description: `${movie.name} removed from ${show.label} Show`,
                                       });
                                     } else {
                                       // Adding to show - check for conflicts
                                       if (isConflict) {
                                         toast({
                                           title: 'Conflict',
                                           description: `${existingMovie?.name} is already assigned to ${show.label} Show. Remove it first.`,
                                           variant: 'destructive',
                                         });
                                         return;
                                       }
                                       
                                       updateShowAssignment(movie.id, show.key, true);
                                       toast({
                                         title: 'Success',
                                         description: `${movie.name} assigned to ${show.label} Show`,
                                       });
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
        </CardContent>
      </Card>

             {/* Weekly Schedule - All Movies */}
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
    </div>
  );
};

export default MovieManagement; 