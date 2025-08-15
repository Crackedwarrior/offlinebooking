import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PrinterInfo {
  name: string;
  port: string;
  type: 'USB' | 'COM' | 'Network';
  connected: boolean;
}

interface PrinterConfig {
  port: string;
  theaterName: string;
  location: string;
  gstin: string;
}

export const PrinterConfig: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [config, setConfig] = useState({
    port: 'COM1',
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
    gstin: '29AAVFS7423E120'
  });

  // Helper function to determine printer type
  const getPrinterType = (port: string): 'USB' | 'COM' | 'Network' => {
    if (!port) return 'COM';
    const lowerPort = port.toLowerCase();
    if (lowerPort.includes('usb')) return 'USB';
    if (lowerPort.includes('com') || lowerPort.includes('lpt')) return 'COM';
    if (lowerPort.includes('tcp') || lowerPort.includes('ip')) return 'Network';
    return 'COM';
  };

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('selectedPrinter');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({
          ...prev,
          theaterName: parsed.theaterName || prev.theaterName,
          location: parsed.location || prev.location,
          gstin: parsed.gstin || prev.gstin
        }));
        
        // Also restore the selected printer if it exists
        if (parsed.name && parsed.port) {
          const savedPrinter: PrinterInfo = {
            name: parsed.name,
            port: parsed.port,
            type: getPrinterType(parsed.port),
            connected: true // Assume it's connected if it was saved
          };
          setSelectedPrinter(savedPrinter);
          console.log('🔍 Restored saved printer:', savedPrinter);
        }
      } catch (error) {
        console.warn('Failed to load saved config:', error);
      }
    }
  }, []);

  // Scan for available printers
  const scanForPrinters = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('http://localhost:3001/api/printer/list');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.printers) {
        // Map backend printer format to our interface
        const printerInfos: PrinterInfo[] = data.printers.map((printer: any) => ({
          name: printer.name,
          port: printer.port || 'Unknown',
          type: getPrinterType(printer.port),
          connected: printer.status === 'ready'
        }));
        
        setPrinters(printerInfos);
        
        // Auto-select the best available printer (prefer EPSON thermal printers)
        const defaultPrinter = printerInfos.find(p => 
          p.connected && (p.name.includes('EPSON') || p.name.includes('Receipt'))
        ) || printerInfos.find(p => p.connected) || printerInfos[0];
        
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter);
          // Also save to localStorage
          localStorage.setItem('selectedPrinter', JSON.stringify({
            name: defaultPrinter.name,
            port: defaultPrinter.port,
            theaterName: config.theaterName,
            location: config.location,
            gstin: config.gstin
          }));
        }
        
        toast.success(`Found ${printerInfos.length} printers`);
      } else {
        throw new Error(data.message || 'Failed to get printers');
      }
    } catch (error) {
      console.error('Failed to scan printers:', error);
      toast.error('Failed to scan for printers');
      // Fallback to mock printers
      setPrinters(getMockPrinters());
    } finally {
      setIsScanning(false);
    }
  };

  // Fallback mock printers
  const getMockPrinters = (): PrinterInfo[] => [
    {
      name: 'EPSON TM-T81 ReceiptE4',
      port: 'USB001',
      type: 'USB',
      connected: true
    },
    {
      name: 'Microsoft Print to PDF',
      port: 'PORTPROMPT:',
      type: 'Network',
      connected: true
    }
  ];

  // Handle printer selection
  const handlePrinterSelect = (printer: PrinterInfo) => {
    console.log('🔍 Selecting printer:', printer);
    setSelectedPrinter(printer);
    setConfig(prev => ({ ...prev, port: printer.port }));
    
    // Save to localStorage
    const printerConfig = {
      name: printer.name,
      port: printer.port,
      theaterName: config.theaterName,
      location: config.location,
      gstin: config.gstin
    };
    localStorage.setItem('selectedPrinter', JSON.stringify(printerConfig));
    console.log('🔍 Saved printer config to localStorage:', printerConfig);
    
    toast.success(`Selected printer: ${printer.name}`);
  };

  // Test printer connection
  const testPrinter = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }

    setIsPrinting(true);
    try {
      const response = await fetch('http://localhost:3001/api/printer/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerConfig: {
            name: selectedPrinter.name,
            port: selectedPrinter.port,
            theaterName: config.theaterName,
            location: config.location,
            gstin: config.gstin
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Printer test successful!');
      } else {
        throw new Error(data.message || 'Printer test failed');
      }
    } catch (error) {
      console.error('Printer test error:', error);
      toast.error('Printer test failed');
    } finally {
      setIsPrinting(false);
    }
  };

  // Update configuration
  const updateConfig = (key: keyof PrinterConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Save to localStorage if printer is selected
    if (selectedPrinter) {
      localStorage.setItem('selectedPrinter', JSON.stringify({
        name: selectedPrinter.name,
        port: selectedPrinter.port,
        theaterName: config.theaterName,
        location: config.location,
        gstin: config.gstin,
        ...config,
        [key]: value
      }));
    }
  };

  // Print test ticket
  const printTestTicket = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }

    setIsPrinting(true);
    try {
      const response = await fetch('http://localhost:3001/api/printer/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: [{
            commands: generateTestTicketCommands(),
            seatId: 'TEST',
            movieName: 'Test Movie',
            date: new Date().toLocaleDateString(),
            showTime: '10:00 AM',
            price: 150,
            customerName: 'Test Customer'
          }],
          printerConfig: {
            name: selectedPrinter.name,
            port: selectedPrinter.port,
            theaterName: config.theaterName,
            location: config.location,
            gstin: config.gstin
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Test ticket printed successfully!');
      } else {
        throw new Error(data.message || 'Printing failed');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print test ticket');
    } finally {
      setIsPrinting(false);
    }
  };

  // Generate ESC/POS commands for test ticket
  const generateTestTicketCommands = (): string => {
    const commands = [
      '\x1B\x40', // Initialize printer
      '\x1B\x61\x01', // Center alignment
      '\x1B\x21\x10', // Double height and width
      'SREELEKHA THEATER\n',
      '\x1B\x21\x00', // Normal size
      'Chickmagalur\n',
      '\x1B\x61\x00', // Left alignment
      '\x1B\x2D\x01', // Underline on
      'Movie: Test Movie\n',
      '\x1B\x2D\x00', // Underline off
      'Date: ' + new Date().toLocaleDateString() + '\n',
      'Show: 10:00 AM\n',
      'Seat: TEST\n',
      'Customer: Test Customer\n',
      '\x1B\x61\x01', // Center alignment
      '\x1B\x21\x10', // Double height and width
      '₹150\n',
      '\x1B\x21\x00', // Normal size
      'GSTIN: 29AAVFS7423E120\n',
      '\x1B\x61\x00', // Left alignment
      '\n\n\n', // Feed paper
      '\x1B\x69' // Cut paper
    ];
    
    return commands.join('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Printer Configuration
        </CardTitle>
        <CardDescription>
          Configure printer settings and test connection
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Printer Discovery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Available Printers</Label>
            <Button 
              onClick={scanForPrinters} 
              disabled={isScanning}
              size="sm"
              variant="outline"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan
                </>
              )}
            </Button>
          </div>
          
          {printers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {isScanning ? 'Scanning for printers...' : 'No printers found. Click Scan to discover printers.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {printers.map((printer, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPrinter?.name === printer.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePrinterSelect(printer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {printer.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{printer.name}</div>
                        <div className="text-xs text-gray-500">
                          {printer.port} • {printer.type}
                        </div>
                      </div>
                    </div>
                    <Badge variant={printer.connected ? "default" : "destructive"}>
                      {printer.connected ? 'Ready' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Printer Info */}
        {selectedPrinter && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900">Selected Printer</div>
            <div className="text-sm text-blue-700">{selectedPrinter.name}</div>
            <div className="text-xs text-blue-600 mt-1">
              {selectedPrinter.port} • {selectedPrinter.type}
            </div>
          </div>
        )}

        {/* Theater Information */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Theater Information</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                value={config.theaterName}
                onChange={(e) => updateConfig('theaterName', e.target.value)}
                placeholder="Theater Name"
              />
            </div>
            <div>
              <Input
                value={config.location}
                onChange={(e) => updateConfig('location', e.target.value)}
                placeholder="Location"
              />
            </div>
            <div className="col-span-2">
              <Input
                value={config.gstin}
                onChange={(e) => updateConfig('gstin', e.target.value)}
                placeholder="GSTIN"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={testPrinter}
            disabled={isPrinting || !selectedPrinter}
            variant="outline"
            className="flex-1"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          
          <Button
            onClick={printTestTicket}
            disabled={isPrinting || !selectedPrinter}
            className="flex-1"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 mr-2" />
                Print Test
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterConfig;