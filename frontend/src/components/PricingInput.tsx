import React, { memo } from 'react';
import { Label } from '@/components/ui/label';

interface PricingInputProps {
  seatClass: {
    label: string;
    rows: string[];
  };
  value: number;
  onChange: (value: string) => void;
}

const PricingInput = memo<PricingInputProps>(({ seatClass, value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Only allow numbers
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    onChange(cleanValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={seatClass.label} className="text-base font-medium">
          {seatClass.label}
        </Label>
        <p className="text-sm text-gray-600 mb-2">
          {seatClass.rows.join(', ')}
        </p>
      </div>
      <input
        id={seatClass.label}
        type="text"
        value={value || 0}
        onChange={handleChange}
        placeholder="Enter price"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
    </div>
  );
});

PricingInput.displayName = 'PricingInput';

export default PricingInput; 