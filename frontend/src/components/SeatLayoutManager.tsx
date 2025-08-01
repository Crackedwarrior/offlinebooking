import React, { useState, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  SeatLayout, 
  TheaterSection, 
  TheaterRow, 
  SeatLayoutManager as LayoutManager,
  DEFAULT_THEATER_LAYOUT,
  THEATER_LAYOUTS
} from '@/lib/seatLayoutConfig';
import { Plus, Edit, Trash2, Copy, Check, X, Settings, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SeatLayoutManagerProps {
  onLayoutChange?: (layout: SeatLayout) => void;
  currentLayout?: SeatLayout;
}

const SeatLayoutManager: React.FC<SeatLayoutManagerProps> = ({ 
  onLayoutChange, 
  currentLayout = DEFAULT_THEATER_LAYOUT 
}) => {
  const [selectedLayout, setSelectedLayout] = useState<SeatLayout>(currentLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLayout, setEditingLayout] = useState<SeatLayout | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<SeatLayout | null>(null);

  const layoutManager = useMemo(() => new LayoutManager(selectedLayout), [selectedLayout]);

  // Memoized layout statistics
  const layoutStats = useMemo(() => {
    const totalSeats = selectedLayout.totalSeats;
    const sections = selectedLayout.sections.length;
    const totalRows = selectedLayout.sections.reduce((sum, section) => sum + section.rows.length, 0);
    
    return { totalSeats, sections, totalRows };
  }, [selectedLayout]);

  // Memoized section statistics
  const sectionStats = useMemo(() => {
    return selectedLayout.sections.map(section => ({
      ...section,
      rowCount: section.rows.length,
      averageSeatsPerRow: Math.round(section.totalSeats / section.rows.length)
    }));
  }, [selectedLayout]);

  // Handle layout selection
  const handleLayoutSelect = useCallback((layoutId: string) => {
    const layout = THEATER_LAYOUTS.find(l => l.id === layoutId);
    if (layout) {
      setSelectedLayout(layout);
      onLayoutChange?.(layout);
      toast({
        title: 'Layout Changed',
        description: `Switched to ${layout.name}`,
      });
    }
  }, [onLayoutChange, toast]);

  // Handle layout creation
  const handleCreateLayout = useCallback(() => {
    const newLayout: Omit<SeatLayout, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'New Theater Layout',
      description: 'Custom theater configuration',
      totalSeats: 0,
      sections: [],
      isActive: false
    };

    try {
      const createdLayout = layoutManager.createLayout(newLayout);
      setEditingLayout(createdLayout);
      setIsEditing(true);
      toast({
        title: 'Layout Created',
        description: 'New layout template created. Add sections and rows.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create layout',
        variant: 'destructive',
      });
    }
  }, [layoutManager, toast]);

  // Handle layout duplication
  const handleDuplicateLayout = useCallback((layout: SeatLayout) => {
    const duplicatedLayout: Omit<SeatLayout, 'id' | 'createdAt' | 'updatedAt'> = {
      ...layout,
      name: `${layout.name} (Copy)`,
      isActive: false
    };

    try {
      const createdLayout = layoutManager.createLayout(duplicatedLayout);
      setEditingLayout(createdLayout);
      setIsEditing(true);
      toast({
        title: 'Layout Duplicated',
        description: 'Layout copied successfully. You can now modify it.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to duplicate layout',
        variant: 'destructive',
      });
    }
  }, [layoutManager, toast]);

  // Handle layout preview
  const handlePreviewLayout = useCallback((layout: SeatLayout) => {
    setPreviewLayout(layout);
    setShowPreview(true);
  }, []);

  // Handle layout deletion
  const handleDeleteLayout = useCallback((layoutId: string) => {
    if (layoutId === DEFAULT_THEATER_LAYOUT.id) {
      toast({
        title: 'Cannot Delete',
        description: 'Default layout cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
      // Remove from layouts array
      const updatedLayouts = THEATER_LAYOUTS.filter(l => l.id !== layoutId);
      // In a real app, this would be saved to storage/database
      
      toast({
        title: 'Layout Deleted',
        description: 'Layout has been removed.',
      });
    }
  }, [toast]);

  // Handle layout save
  const handleSaveLayout = useCallback((layout: SeatLayout) => {
    try {
      const validation = layoutManager.validateLayout(layout);
      if (!validation.isValid) {
        toast({
          title: 'Validation Error',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      // In a real app, this would save to storage/database
      toast({
        title: 'Layout Saved',
        description: 'Layout has been saved successfully.',
      });
      
      setIsEditing(false);
      setEditingLayout(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save layout',
        variant: 'destructive',
      });
    }
  }, [layoutManager, toast]);

  // Memoized layout options
  const layoutOptions = useMemo(() => {
    return THEATER_LAYOUTS.map(layout => ({
      value: layout.id,
      label: layout.name,
      description: layout.description,
      isActive: layout.isActive
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seat Layout Management</h2>
          <p className="text-gray-600">Configure and manage theater seat layouts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateLayout}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Layout
          </Button>
        </div>
      </div>

      {/* Layout Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Current Layout</CardTitle>
          <CardDescription>Select the active theater layout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedLayout.id} onValueChange={handleLayoutSelect}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a layout" />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      {option.isActive && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewLayout(selectedLayout)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDuplicateLayout(selectedLayout)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              {selectedLayout.id !== DEFAULT_THEATER_LAYOUT.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteLayout(selectedLayout.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Seats</p>
                <p className="text-2xl font-bold">{layoutStats.totalSeats}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sections</p>
                <p className="text-2xl font-bold">{layoutStats.sections}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rows</p>
                <p className="text-2xl font-bold">{layoutStats.totalRows}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Details */}
      <Card>
        <CardHeader>
          <CardTitle>Section Details</CardTitle>
          <CardDescription>Overview of all sections in the current layout</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Avg/Row</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionStats.map((section) => (
                <TableRow key={section.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{section.name}</p>
                      <p className="text-sm text-gray-500">{section.classLabel}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{section.classKey}</Badge>
                  </TableCell>
                  <TableCell>₹{section.price}</TableCell>
                  <TableCell>{section.rowCount}</TableCell>
                  <TableCell>{section.totalSeats}</TableCell>
                  <TableCell>{section.averageSeatsPerRow}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewLayout(selectedLayout)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Layout Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Layout Preview: {previewLayout?.name}</DialogTitle>
            <DialogDescription>
              {previewLayout?.description}
            </DialogDescription>
          </DialogHeader>
          
          {previewLayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{previewLayout.totalSeats}</p>
                  <p className="text-sm text-gray-600">Total Seats</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">{previewLayout.sections.length}</p>
                  <p className="text-sm text-gray-600">Sections</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {previewLayout.sections.reduce((sum, section) => sum + section.rows.length, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Rows</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {previewLayout.sections.map((section) => (
                  <div key={section.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{section.name}</h4>
                        <p className="text-sm text-gray-600">{section.classLabel} - ₹{section.price}</p>
                      </div>
                      <Badge variant="outline">{section.totalSeats} seats</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {section.rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium w-16">{row.name}:</span>
                          <div className="flex gap-1">
                            {row.seats.map((seat, index) => (
                              <div
                                key={index}
                                className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                                  typeof seat === 'number' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {typeof seat === 'number' ? seat : '·'}
                              </div>
                            ))}
                          </div>
                          <span className="text-gray-500">({row.totalSeats})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Layout Editor Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Layout: {editingLayout?.name}</DialogTitle>
            <DialogDescription>
              Configure the theater layout sections and rows
            </DialogDescription>
          </DialogHeader>
          
          {editingLayout && (
            <div className="space-y-6">
              {/* Layout Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="layout-name">Layout Name</Label>
                  <Input
                    id="layout-name"
                    value={editingLayout.name}
                    onChange={(e) => setEditingLayout({
                      ...editingLayout,
                      name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="layout-description">Description</Label>
                  <Input
                    id="layout-description"
                    value={editingLayout.description}
                    onChange={(e) => setEditingLayout({
                      ...editingLayout,
                      description: e.target.value
                    })}
                  />
                </div>
              </div>

              <Separator />

              {/* Sections Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Sections</h4>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {editingLayout.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">{section.name}</h5>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label>Section Name</Label>
                        <Input
                          value={section.name}
                          onChange={(e) => {
                            const updatedSections = [...editingLayout.sections];
                            updatedSections[sectionIndex] = {
                              ...section,
                              name: e.target.value
                            };
                            setEditingLayout({
                              ...editingLayout,
                              sections: updatedSections
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Class Label</Label>
                        <Input
                          value={section.classLabel}
                          onChange={(e) => {
                            const updatedSections = [...editingLayout.sections];
                            updatedSections[sectionIndex] = {
                              ...section,
                              classLabel: e.target.value
                            };
                            setEditingLayout({
                              ...editingLayout,
                              sections: updatedSections
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Price</Label>
                        <Input
                          type="number"
                          value={section.price}
                          onChange={(e) => {
                            const updatedSections = [...editingLayout.sections];
                            updatedSections[sectionIndex] = {
                              ...section,
                              price: parseInt(e.target.value) || 0
                            };
                            setEditingLayout({
                              ...editingLayout,
                              sections: updatedSections
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          value={section.color}
                          onChange={(e) => {
                            const updatedSections = [...editingLayout.sections];
                            updatedSections[sectionIndex] = {
                              ...section,
                              color: e.target.value
                            };
                            setEditingLayout({
                              ...editingLayout,
                              sections: updatedSections
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Rows Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h6 className="font-medium">Rows</h6>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Row
                        </Button>
                      </div>
                      
                      {section.rows.map((row, rowIndex) => (
                        <div key={row.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Input
                            className="w-20"
                            value={row.name}
                            onChange={(e) => {
                              const updatedSections = [...editingLayout.sections];
                              const updatedRows = [...section.rows];
                              updatedRows[rowIndex] = {
                                ...row,
                                name: e.target.value
                              };
                              updatedSections[sectionIndex] = {
                                ...section,
                                rows: updatedRows
                              };
                              setEditingLayout({
                                ...editingLayout,
                                sections: updatedSections
                              });
                            }}
                          />
                          <span>:</span>
                          <Input
                            className="flex-1"
                            placeholder="1,2,3,4,5 or 1,2,3,,4,5 for gaps"
                            value={row.seats.map(s => typeof s === 'number' ? s : '').join(',')}
                            onChange={(e) => {
                              const seatValues = e.target.value.split(',').map(s => {
                                const trimmed = s.trim();
                                return trimmed === '' ? '' : parseInt(trimmed) || '';
                              });
                              
                              const updatedSections = [...editingLayout.sections];
                              const updatedRows = [...section.rows];
                              updatedRows[rowIndex] = {
                                ...row,
                                seats: seatValues,
                                totalSeats: seatValues.filter(s => typeof s === 'number').length
                              };
                              updatedSections[sectionIndex] = {
                                ...section,
                                rows: updatedRows,
                                totalSeats: updatedRows.reduce((sum, r) => sum + r.totalSeats, 0)
                              };
                              setEditingLayout({
                                ...editingLayout,
                                sections: updatedSections,
                                totalSeats: updatedSections.reduce((sum, s) => sum + s.totalSeats, 0)
                              });
                            }}
                          />
                          <Button size="sm" variant="outline" className="text-red-600">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingLayout(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => editingLayout && handleSaveLayout(editingLayout)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Layout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(SeatLayoutManager); 