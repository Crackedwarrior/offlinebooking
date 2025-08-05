import React, { memo, forwardRef } from 'react';
import { Input } from '@/components/ui/input';

interface StableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number;
  onChange: (value: string) => void;
}

const StableInput = memo(forwardRef<HTMLInputElement, StableInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
));

StableInput.displayName = 'StableInput';

export default StableInput; 