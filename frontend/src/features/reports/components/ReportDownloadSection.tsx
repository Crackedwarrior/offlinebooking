/**
 * Report Download Section Component
 * Extracted from BoxVsOnlineReport.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileDown, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface ReportDownloadSectionProps {
  selectedDate: Date;
  onPreview: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  isGeneratingPDF?: boolean;
}

export const ReportDownloadSection: React.FC<ReportDownloadSectionProps> = ({
  selectedDate,
  onPreview,
  onExportExcel,
  onExportPDF,
  isGeneratingPDF = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button 
        onClick={onExportExcel} 
        size="default"
        className="flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export to Excel
      </Button>
      <Button 
        onClick={onExportPDF} 
        variant="outline"
        size="default"
        className="flex items-center gap-2 px-6 py-2 rounded-full"
        disabled={isGeneratingPDF}
      >
        <FileDown className="w-4 h-4" />
        {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
      </Button>
    </div>
  );
};

