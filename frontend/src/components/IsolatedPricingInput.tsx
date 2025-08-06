import React, { useState, useEffect, useRef } from 'react';
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
  const [localValue, setLocalValue] = useState(initialValue.toString());
  const isFocusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update local value on mount, never during typing
  useEffect(() => {
    console.log(`🔍 [${seatClass.label}] Component mounted with initialValue:`, initialValue);
    setLocalValue(initialValue.toString());
  }, []); // Empty dependency array - only runs on mount

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`🔍 [${seatClass.label}] Input change:`, e.target.value);
    const inputValue = e.target.value;
    // Only allow numbers
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    setLocalValue(cleanValue);
    
    // Notify parent that changes were made (for save button) but don't update state
    onValueChange(seatClass.label, cleanValue === '' ? 0 : parseInt(cleanValue) || 0);
  };

  const handleFocus = () => {
    console.log(`🔍 [${seatClass.label}] Input focused`);
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    console.log(`🔍 [${seatClass.label}] Input blurred`);
    isFocusedRef.current = false;
    // Ensure the value is synced on blur
    const price = localValue === '' ? 0 : parseInt(localValue) || 0;
    onValueChange(seatClass.label, price);
  };

  // No cleanup needed since we removed timeouts

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={seatClass.label} className="text-base font-medium">
          {seatClass.label}
        </Label>
        {/* Removed seat names list here */}
      </div>
      <input
        ref={inputRef}
        id={seatClass.label}
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Enter price"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
    </div>
  );
});

IsolatedPricingInput.displayName = 'IsolatedPricingInput';

export default IsolatedPricingInput; 