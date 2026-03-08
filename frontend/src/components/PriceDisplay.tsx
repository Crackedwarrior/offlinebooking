import React from 'react';
import { usePricing } from '@/hooks/use-pricing';
import { SEAT_CLASSES } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Film, Sparkles, Users, DollarSign } from 'lucide-react';

/**
 * Enhanced component to display current pricing with modern design
 */
const PriceDisplay: React.FC = () => {
  const { pricing, pricingVersion } = usePricing();

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

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1 text-xs font-semibold shadow-sm flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          Live
        </Badge>
        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-md">v{pricingVersion}</span>
      </div>
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {SEAT_CLASSES.map((seatClass, index) => {
          const price = pricing[seatClass.label] || 0;
          return (
            <div 
              key={seatClass.label} 
              className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-green-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-lg shadow-sm group-hover:bg-green-50 transition-colors border border-gray-100">
                    {getSeatClassIcon(seatClass.label)}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-gray-900 block">{seatClass.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">Active Price</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-green-600">₹</span>
                  <span className="text-2xl font-bold text-green-600 tabular-nums">{price.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceDisplay; 