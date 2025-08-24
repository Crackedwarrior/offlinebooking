import React from 'react';
import { Label } from '@/components/ui/label';

interface IsolatedPricingInputProps {
  seatClass: {
    label: string;
    rows: string[];
  };
  initialValue: number;
  onValueChange: (classLabel: string, value: number) => void;
}

const IsolatedPricingInput = React.memo(function IsolatedPricingInput({
  seatClass,
  initialValue,
  onValueChange
}: IsolatedPricingInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Only allow numbers
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    const numericValue = cleanValue === '' ? 0 : parseInt(cleanValue) || 0;
    onValueChange(seatClass.label, numericValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={seatClass.label} className="text-base font-medium">
          {seatClass.label}
        </Label>
      </div>
      <input
        id={seatClass.label}
        type="text"
        defaultValue={initialValue.toString()}
        onChange={handleChange}
        placeholder="Enter price"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
    </div>
  );
});

IsolatedPricingInput.displayName = 'IsolatedPricingInput';

export default IsolatedPricingInput; 