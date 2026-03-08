/**
 * Pricing Tab Component
 * Extracted from Settings.tsx
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, Sparkles, Crown, Star, Film, Users, Save, X } from 'lucide-react';
import { SEAT_CLASSES } from '@/lib/config';
import type { UseFormRegister } from 'react-hook-form';

interface PricingTabProps {
  register: UseFormRegister<any>;
  showSaveButton?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  hasErrors?: boolean;
}

// Icon mapping for seat classes
const getSeatClassIcon = (label: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'BOX': <Crown className="w-4 h-4 text-amber-500" />,
    'STAR CLASS': <Star className="w-4 h-4 text-yellow-500" />,
    'CLASSIC': <Film className="w-4 h-4 text-blue-500" />,
    'FIRST CLASS': <Sparkles className="w-4 h-4 text-purple-500" />,
    'SECOND CLASS': <Users className="w-4 h-4 text-gray-500" />,
  };
  return iconMap[label] || <DollarSign className="w-4 h-4 text-gray-400" />;
};

export const PricingTab: React.FC<PricingTabProps> = ({ 
  register, 
  showSaveButton = false, 
  onSave, 
  onCancel,
  hasErrors = false 
}) => {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 border-0 shadow-lg relative overflow-hidden w-full h-full">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 shadow-lg border-b border-blue-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  PRICING CONFIGURATION
                </p>
                <p className="text-sm text-blue-100 font-normal leading-tight">
                  Set ticket prices for each seat class (BOX, STAR CLASS, CLASSIC, FIRST CLASS, SECOND CLASS) to manage your revenue structure
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-4 py-4 pb-20">
          <div className="flex flex-col min-h-0 w-full h-full">
            <div className="flex-1 min-h-0 flex flex-col gap-3 justify-between">
              {SEAT_CLASSES.map((seatClass, index) => (
                <div key={seatClass.label} className="relative flex items-center w-full flex-1">
                  {/* Left Perforation */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-slate-50 via-white to-slate-50 border-2 border-gray-200 z-20"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
                    }}
                  ></div>
                  
                  {/* Main Ticket Card */}
                  <div 
                    className="group relative ticket-card bg-white border-2 border-gray-200 hover:border-blue-400 p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 w-full h-full flex items-center"
                  >
                    {/* Content */}
                    <div className="flex flex-row items-center gap-4 w-full">
                      {/* Label */}
                      <Label 
                        htmlFor={seatClass.label} 
                        className="text-base font-bold text-gray-800 cursor-pointer group-hover:text-blue-700 transition-colors duration-300 flex-shrink-0 min-w-[140px]"
                      >
                        {seatClass.label}
                      </Label>
                      
                      {/* Input Field */}
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                          <span className="text-lg font-bold text-gray-400 group-hover:text-blue-600 transition-colors duration-300">₹</span>
                        </div>
                        <input
                          {...register(seatClass.label, {
                            setValueAs: (value) => {
                              if (typeof value === 'number') {
                                return value;
                              }
                              if (typeof value === 'string') {
                                const cleanValue = value.replace(/[^0-9]/g, '');
                                return cleanValue === '' ? 0 : parseInt(cleanValue) || 0;
                              }
                              return 0;
                            }
                          })}
                          type="text"
                          placeholder="0"
                          id={seatClass.label}
                          className="flex h-12 w-full rounded-lg border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white pl-11 pr-4 py-3 text-lg font-bold text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500 hover:border-blue-200 transition-all duration-300 shadow-inner hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Perforation */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-slate-50 via-white to-slate-50 border-2 border-gray-200 z-20"
                    style={{
                      clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
                    }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        
        {/* Sticky Save Bar */}
        {showSaveButton && (
          <CardFooter className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>You have unsaved changes</span>
              </div>
              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="border-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={onSave}
                  disabled={hasErrors}
                  className={`${
                    hasErrors 
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md'
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {hasErrors ? 'Resolve Errors to Save' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
      <style>{`
        .ticket-card {
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

