import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import printerService from '@/services/printerService';

interface PrinterStatus {
  connected: boolean;
  ready: boolean;
  paperStatus: string;
  errorStatus: string;
}

export const PrinterConfig: React.FC = () => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [useManualPort, setUseManualPort] = useState(false);
  const [config, setConfig] = useState({
    port: 'COM1',
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
    gstin: '29AAVFS7423E120'
  });

  useEffect(() => {
    fetchPrinters();
    checkPrinterStatus();
  }, []);

  const fetchPrinters = async () => {
    try {
      // For browser environment, just use default printers
      setPrinters(['COM1', 'COM2', 'COM3']);
    } catch (error) {
      console.error('Failed to fetch printers:', error);
      setPrinters(['COM1', 'COM2', 'COM3']);
    }
  };

  const handlePrinterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPrinter(value);
    if (value === '__manual__') {
      setUseManualPort(true);
    } else {
      setUseManualPort(false);
      setConfig(prev => ({ ...prev, port: value }));
    }
  };

  const checkPrinterStatus = async () => {
    try {
      const status = await printerService.getPrinterStatus();
      setPrinterStatus(status);
    } catch (error) {
      console.error('Failed to get printer status:', error);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      // Configure printer with current settings
      printerService.configurePrinter(
        config.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      const success = await printerService.testConnection();
      if (success) {
        await checkPrinterStatus();
        console.log('✅ Printer connection test successful');
      } else {
        console.error('❌ Printer connection test failed');
      }
    } catch (error) {
      console.error('❌ Printer connection test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const printTestTicket = async () => {
    setIsPrinting(true);
    try {
      // Configure printer
      printerService.configurePrinter(
        config.port,
        config.theaterName,
        config.location,
        config.gstin
      );

      // Get current date and time
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Create a test ticket with realistic data
      const testTicket = printerService.formatTicketData(
        'A1',
        'A',
        1,
        'STAR',
        150,
        currentDate,
        currentTime,
        'Test Movie'
      );

      const success = await printerService.printTicket(testTicket);
      if (success) {
        console.log('✅ Test ticket printed successfully');
      } else {
        console.error('❌ Failed to print test ticket');
      }
    } catch (error) {
      console.error('❌ Test ticket printing error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const updateConfig = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🖨️ Printer Configuration
          {printerStatus && (
            <Badge variant={printerStatus.connected ? "default" : "destructive"}>
              {printerStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure Epson TM-T20 M249A POS printer settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Printer Status */}
        {printerStatus && (
          <div className="space-y-2">
            <Label>Printer Status</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Ready: <Badge variant={printerStatus.ready ? "default" : "secondary"}>{printerStatus.ready ? "Yes" : "No"}</Badge></div>
              <div>Paper: <Badge variant={printerStatus.paperStatus === "OK" ? "default" : "destructive"}>{printerStatus.paperStatus}</Badge></div>
              <div>Error: <Badge variant={printerStatus.errorStatus === "No Error" ? "default" : "destructive"}>{printerStatus.errorStatus}</Badge></div>
            </div>
          </div>
        )}

        {/* Printer Selection Dropdown */}
        <div>
          <Label htmlFor="printer-select">Select Printer</Label>
          <select
            id="printer-select"
            className="w-full border rounded px-2 py-1 mt-1"
            value={useManualPort ? '__manual__' : config.port}
            onChange={handlePrinterChange}
          >
            <option value="">-- Select Printer --</option>
            {printers.map((printer) => (
              <option key={printer} value={printer}>{printer}</option>
            ))}
            <option value="__manual__">Other / Manual</option>
          </select>
        </div>

        {/* Manual Port Input */}
        {useManualPort && (
          <div>
            <Label htmlFor="port">Printer Port</Label>
            <Input
              id="port"
              value={config.port}
              onChange={(e) => updateConfig('port', e.target.value)}
              placeholder="COM1"
            />
          </div>
        )}

        {/* Configuration Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="theaterName">Theater Name</Label>
            <Input
              id="theaterName"
              value={config.theaterName}
              onChange={(e) => updateConfig('theaterName', e.target.value)}
              placeholder="SREELEKHA THEATER"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={config.location}
              onChange={(e) => updateConfig('location', e.target.value)}
              placeholder="Chickmagalur"
            />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              value={config.gstin}
              onChange={(e) => updateConfig('gstin', e.target.value)}
              placeholder="29AAVFS7423E120"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={isTesting}
            variant="outline"
            className="flex-1"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button 
            onClick={printTestTicket} 
            disabled={isPrinting || !printerStatus?.connected}
            className="flex-1"
          >
            {isPrinting ? "Printing..." : "Print Test"}
          </Button>
        </div>
        <Button 
          onClick={checkPrinterStatus} 
          variant="ghost" 
          size="sm"
          className="w-full"
        >
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrinterConfig; 