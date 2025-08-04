import React from 'react';
import { usePricing } from '@/hooks/use-pricing';
import { SEAT_CLASSES } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Test component to display current pricing and verify dynamic updates
 */
const PriceDisplay: React.FC = () => {
  const { pricing, pricingVersion } = usePricing();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Current Pricing
          <Badge variant="secondary">v{pricingVersion}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {SEAT_CLASSES.map(seatClass => (
            <div key={seatClass.label} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{seatClass.label}</span>
              <span className="text-green-600 font-bold">₹{pricing[seatClass.label] || 0}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Update prices in Settings → Pricing to see real-time changes
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceDisplay; 