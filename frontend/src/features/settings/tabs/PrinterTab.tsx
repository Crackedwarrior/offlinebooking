/**
 * Printer Tab Component
 * Extracted from Settings.tsx
 */

import React from 'react';
import { Printer } from 'lucide-react';
import PrinterConfig from '../components/PrinterConfig';

export const PrinterTab: React.FC = () => {
  return (
    <div className="h-full flex flex-col min-h-0">
      <PrinterConfig />
    </div>
  );
};

