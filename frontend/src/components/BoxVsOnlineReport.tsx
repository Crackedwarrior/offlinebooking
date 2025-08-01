import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Download, FileText, Eye, Table } from 'lucide-react';
import { getBookings, getSeatStatus } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SEAT_CLASSES } from '@/lib/config';
import type { Show } from '@/types/api';

interface SalesData {
  movie_date: string;
  movie: string;
  show: string;
  classLabel: string;
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
}

interface ShowSummary {
  show: string;
  show_label: string;
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
  classBreakdown: SalesData[];
}

const BoxVsOnlineReport = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customDate, setCustomDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  // Get current date for "present day" option
  const currentDate = new Date().toISOString().split('T')[0];
  const reportDate = useCustomDate ? customDate : selectedDate;

  // Fetch sales data
  const fetchSalesData = async (date: string) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching sales data for date:', date);
      
      // Fetch bookings data
      const bookingsResponse = await getBookings({ date });
      
      if (bookingsResponse.success && bookingsResponse.data) {
        const bookings = bookingsResponse.data;
        console.log('📊 Fetched bookings:', bookings.length);
        
        // Fetch seat status for all shows to get BMS seats
        const shows: Show[] = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
        const seatStatusPromises = shows.map(show => 
          getSeatStatus({ date, show }).catch(error => {
            console.warn(`Failed to fetch seat status for ${show}:`, error);
            return { success: false, data: null };
          })
        );
        
        const seatStatusResponses = await Promise.all(seatStatusPromises);
        let allBmsSeats: any[] = [];
        
        seatStatusResponses.forEach((response, index) => {
          if (response.success && response.data && response.data.bmsSeats) {
            console.log(`📊 BMS seats for ${shows[index]}:`, response.data.bmsSeats.length);
            allBmsSeats = allBmsSeats.concat(response.data.bmsSeats);
          }
        });
        
        console.log('📊 Total BMS seats found:', allBmsSeats.length);
        
        // Process bookings and BMS seat data
        const processedData = processBookingsWithBMSSeats(bookings, allBmsSeats, date);
        setSalesData(processedData);
        
        toast({
          title: 'Success',
          description: `Sales data loaded for ${format(new Date(date), 'dd/MM/yyyy')}`,
        });
      } else {
        throw new Error('Failed to fetch sales data');
      }
    } catch (error) {
      console.error('❌ Error fetching sales data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Process bookings and BMS seat data to separate online and counter sales
  const processBookingsWithBMSSeats = (bookings: any[], bmsSeats: any[], date: string): SalesData[] => {
    const salesByShowAndClass: Record<string, SalesData> = {};
    
    // First, process regular bookings (counter sales)
    bookings.forEach(booking => {
      const show = booking.show;
      const classLabel = booking.classLabel || 'UNKNOWN';
      const key = `${show}_${classLabel}`;
      
      if (!salesByShowAndClass[key]) {
        salesByShowAndClass[key] = {
          movie_date: date,
          movie: booking.movie || 'Unknown Movie',
          show: show,
          classLabel: classLabel,
          online_qty: 0,
          bms_pos_qty: 0,
          counter_qty: 0,
          total_qty: 0,
          online_amt: 0,
          bms_pos_amt: 0,
          counter_amt: 0,
          total_amt: 0
        };
      }
      
      const entry = salesByShowAndClass[key];
      const seatCount = booking.seatCount || (booking.bookedSeats?.length || 0);
      const totalPrice = booking.totalPrice || 0;
      
      // All regular bookings are counter sales
      entry.counter_qty += seatCount;
      entry.counter_amt += totalPrice;
      entry.total_qty += seatCount;
      entry.total_amt += totalPrice;
    });
    
    // Then, process BMS seats (online sales)
    bmsSeats.forEach(bmsSeat => {
      console.log('🔍 Processing BMS seat:', bmsSeat);
      
      // Extract show and class from seat ID (e.g., "BOX-A1" -> show: "BOX", class: "BOX")
      const seatId = bmsSeat.seatId || bmsSeat;
      const show = extractShowFromSeatId(seatId);
      const classLabel = extractClassFromSeatId(seatId);
      const key = `${show}_${classLabel}`;
      
      if (!salesByShowAndClass[key]) {
        salesByShowAndClass[key] = {
          movie_date: date,
          movie: 'Unknown Movie', // BMS seats might not have movie info
          show: show,
          classLabel: classLabel,
          online_qty: 0,
          bms_pos_qty: 0,
          counter_qty: 0,
          total_qty: 0,
          online_amt: 0,
          bms_pos_amt: 0,
          counter_amt: 0,
          total_amt: 0
        };
      }
      
      const entry = salesByShowAndClass[key];
      const pricePerSeat = getPriceForClass(classLabel);
      
      // BMS seats are online sales
      entry.online_qty += 1;
      entry.online_amt += pricePerSeat;
      entry.total_qty += 1;
      entry.total_amt += pricePerSeat;
    });
    
    return Object.values(salesByShowAndClass);
  };

  // Extract show from seat ID
  const extractShowFromSeatId = (seatId: string): string => {
    // Seat IDs like "BOX-A1", "SC-B2", "CB-C3" etc.
    const parts = seatId.split('-');
    if (parts.length >= 2) {
      const classCode = parts[0];
      // Map class codes to shows - based on the seat grid image, most BMS seats are in EVENING show
      const showMap: Record<string, string> = {
        'BOX': 'EVENING', // BOX seats are in evening show
        'SC': 'EVENING',  // STAR CLASS
        'CB': 'EVENING',  // CLASSIC BALCONY
        'FC': 'EVENING',  // FIRST CLASS
        'SC2': 'EVENING'  // SECOND CLASS
      };
      return showMap[classCode] || 'EVENING';
    }
    return 'EVENING'; // Default to EVENING show
  };

  // Extract class from seat ID
  const extractClassFromSeatId = (seatId: string): string => {
    const parts = seatId.split('-');
    if (parts.length >= 2) {
      const classCode = parts[0];
      const classMap: Record<string, string> = {
        'BOX': 'BOX',
        'SC': 'STAR CLASS',
        'CB': 'CLASSIC',
        'FC': 'FIRST CLASS',
        'SC2': 'SECOND CLASS'
      };
      return classMap[classCode] || 'UNKNOWN';
    }
    return 'UNKNOWN';
  };

  // Get price for seat class
  const getPriceForClass = (classLabel: string): number => {
    const priceMap: Record<string, number> = {
      'BOX': 150,
      'STAR CLASS': 150,
      'CLASSIC': 120,
      'FIRST CLASS': 70,
      'SECOND CLASS': 50
    };
    return priceMap[classLabel] || 0;
  };

  // Get show label
  const getShowLabel = (show: string): string => {
    const showMap: Record<string, string> = {
      'MORNING': 'Morning Show',
      'MATINEE': 'Matinee Show',
      'EVENING': 'Evening Show',
      'NIGHT': 'Night Show'
    };
    return showMap[show] || show;
  };

  // Calculate show summaries
  const showSummaries = useMemo(() => {
    const summaries: Record<string, ShowSummary> = {};
    
    salesData.forEach(item => {
             if (!summaries[item.show]) {
         summaries[item.show] = {
           show: item.show,
           show_label: getShowLabel(item.show),
           online_qty: 0,
           bms_pos_qty: 0,
           counter_qty: 0,
           total_qty: 0,
           online_amt: 0,
           bms_pos_amt: 0,
           counter_amt: 0,
           total_amt: 0,
           classBreakdown: []
         };
       }
      
             const summary = summaries[item.show];
       summary.online_qty += item.online_qty;
       summary.bms_pos_qty += item.bms_pos_qty;
       summary.counter_qty += item.counter_qty;
       summary.total_qty += item.total_qty;
       summary.online_amt += item.online_amt;
       summary.bms_pos_amt += item.bms_pos_amt;
       summary.counter_amt += item.counter_amt;
       summary.total_amt += item.total_amt;
       summary.classBreakdown.push(item);
    });
    
    return Object.values(summaries);
  }, [salesData]);

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    return showSummaries.reduce((totals, summary) => ({
      online_qty: totals.online_qty + summary.online_qty,
      bms_pos_qty: totals.bms_pos_qty + summary.bms_pos_qty,
      counter_qty: totals.counter_qty + summary.counter_qty,
      total_qty: totals.total_qty + summary.total_qty,
      online_amt: totals.online_amt + summary.online_amt,
      bms_pos_amt: totals.bms_pos_amt + summary.bms_pos_amt,
      counter_amt: totals.counter_amt + summary.counter_amt,
      total_amt: totals.total_amt + summary.total_amt
    }), {
      online_qty: 0,
      bms_pos_qty: 0,
      counter_qty: 0,
      total_qty: 0,
      online_amt: 0,
      bms_pos_amt: 0,
      counter_amt: 0,
      total_amt: 0
    });
  }, [showSummaries]);

  // Handle date change
  const handleDateChange = (date: string) => {
    if (useCustomDate) {
      setCustomDate(date);
    } else {
      setSelectedDate(date);
    }
  };

  // Load data when date changes
  useEffect(() => {
    if (reportDate) {
      fetchSalesData(reportDate);
    }
  }, [reportDate]);

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Create CSV content
      const csvContent = generateCSVContent();
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `box_vs_online_report_${reportDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Success',
        description: 'Excel file downloaded successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export file',
        variant: 'destructive',
      });
    }
  };

  // Generate CSV content
  const generateCSVContent = () => {
    const headers = [
      'MOVIE DATE',
      'MOVIE NAME', 
      'ScreenClass',
      'ONLINE Qty',
      'BMS POS QTY',
      'COUNTER QTY',
      'Total Qty',
      'ONLINE AMT',
      'BMS POS AMT',
      'COUNTER AMT',
      'Total AMT'
    ].join(',');

    const rows = salesData.map(item => [
      format(new Date(item.movie_date), 'dd-MMM-yyyy'),
      item.movie,
      item.classLabel,
      item.online_qty,
      item.bms_pos_qty,
      item.counter_qty,
      item.total_qty,
      item.online_amt.toFixed(2),
      item.bms_pos_amt.toFixed(2),
      item.counter_amt.toFixed(2),
      item.total_amt.toFixed(2)
    ].join(','));

    return [headers, ...rows].join('\n');
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      // Create HTML content for PDF
      const htmlContent = generatePDFContent();
      
      // Create and download file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `box_vs_online_report_${reportDate}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Success',
        description: 'PDF file downloaded successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export file',
        variant: 'destructive',
      });
    }
  };

  // Generate PDF content
  const generatePDFContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Box vs Online Sale Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .header { text-align: center; margin-bottom: 20px; }
          .summary { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Box vs Online Sale Report</h1>
          <h2>Sreelekha Theatre Chikmagaluru</h2>
          <p>From ${format(new Date(reportDate), 'dd/MM/yyyy')} Until ${format(new Date(reportDate), 'dd/MM/yyyy')}</p>
        </div>
        
        <div class="summary">
          <h3>Overall Summary</h3>
          <p>Online Qty: ${overallTotals.online_qty} | Counter Qty: ${overallTotals.counter_qty} | Total Qty: ${overallTotals.total_qty}</p>
          <p>Online Amt: ₹${overallTotals.online_amt.toLocaleString()} | Counter Amt: ₹${overallTotals.counter_amt.toLocaleString()} | Total Amt: ₹${overallTotals.total_amt.toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>MOVIE DATE</th>
              <th>MOVIE NAME</th>
              <th>ScreenClass</th>
              <th>ONLINE Qty</th>
              <th>BMS POS QTY</th>
              <th>COUNTER QTY</th>
              <th>Total Qty</th>
              <th>ONLINE AMT</th>
              <th>BMS POS AMT</th>
              <th>COUNTER AMT</th>
              <th>Total AMT</th>
            </tr>
          </thead>
          <tbody>
            ${salesData.map(item => `
              <tr>
                <td>${format(new Date(item.movie_date), 'dd-MMM-yyyy')}</td>
                <td>${item.movie}</td>
                <td>${item.classLabel}</td>
                <td>${item.online_qty}</td>
                <td>${item.bms_pos_qty}</td>
                <td>${item.counter_qty}</td>
                <td>${item.total_qty}</td>
                <td>₹${item.online_amt.toFixed(2)}</td>
                <td>₹${item.bms_pos_amt.toFixed(2)}</td>
                <td>₹${item.counter_amt.toFixed(2)}</td>
                <td>₹${item.total_amt.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Report Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Box vs Online Sale Report</h1>
        <p className="text-lg text-gray-600 mb-1">Sreelekha Theatre Chikmagaluru</p>
        <p className="text-sm text-gray-500">
          From {format(new Date(reportDate), 'dd/MM/yyyy')} Until {format(new Date(reportDate), 'dd/MM/yyyy')}
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="present-day"
                checked={!useCustomDate}
                onChange={() => setUseCustomDate(false)}
                className="w-4 h-4"
              />
              <label htmlFor="present-day" className="text-sm font-medium">
                Present Day ({format(new Date(currentDate), 'dd/MM/yyyy')})
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="custom-date"
                checked={useCustomDate}
                onChange={() => setUseCustomDate(true)}
                className="w-4 h-4"
              />
              <label htmlFor="custom-date" className="text-sm font-medium">
                Custom Date
              </label>
            </div>
            
            {useCustomDate && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            )}
            
            <Button
              onClick={() => fetchSalesData(reportDate)}
              disabled={loading}
              className="ml-4"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

             {/* Overall Summary */}
       <Card>
         <CardHeader>
           <CardTitle>Overall Summary</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-3 md:grid-cols-8 gap-4">
             <div className="text-center p-4 bg-blue-50 rounded-lg">
               <div className="text-2xl font-bold text-blue-600">{overallTotals.online_qty}</div>
               <div className="text-sm text-blue-600">Online Qty</div>
             </div>
             <div className="text-center p-4 bg-orange-50 rounded-lg">
               <div className="text-2xl font-bold text-orange-600">{overallTotals.bms_pos_qty}</div>
               <div className="text-sm text-orange-600">BMS POS Qty</div>
             </div>
             <div className="text-center p-4 bg-green-50 rounded-lg">
               <div className="text-2xl font-bold text-green-600">{overallTotals.counter_qty}</div>
               <div className="text-sm text-green-600">Counter Qty</div>
             </div>
             <div className="text-center p-4 bg-purple-50 rounded-lg">
               <div className="text-2xl font-bold text-purple-600">{overallTotals.total_qty}</div>
               <div className="text-sm text-purple-600">Total Qty</div>
             </div>
             <div className="text-center p-4 bg-blue-50 rounded-lg">
               <div className="text-2xl font-bold text-blue-600">₹{overallTotals.online_amt.toLocaleString()}</div>
               <div className="text-sm text-blue-600">Online Amt</div>
             </div>
             <div className="text-center p-4 bg-orange-50 rounded-lg">
               <div className="text-2xl font-bold text-orange-600">₹{overallTotals.bms_pos_amt.toLocaleString()}</div>
               <div className="text-sm text-orange-600">BMS POS Amt</div>
             </div>
             <div className="text-center p-4 bg-green-50 rounded-lg">
               <div className="text-2xl font-bold text-green-600">₹{overallTotals.counter_amt.toLocaleString()}</div>
               <div className="text-sm text-green-600">Counter Amt</div>
             </div>
             <div className="text-center p-4 bg-purple-50 rounded-lg">
               <div className="text-2xl font-bold text-purple-600">₹{overallTotals.total_amt.toLocaleString()}</div>
               <div className="text-sm text-purple-600">Total Amt</div>
             </div>
           </div>
         </CardContent>
       </Card>

       {/* View Mode Toggle */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center justify-between">
             <span>Report View</span>
             <div className="flex gap-2">
               <Button
                 variant={viewMode === 'summary' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setViewMode('summary')}
                 className="flex items-center gap-2"
               >
                 <Table className="w-4 h-4" />
                 Summary View
               </Button>
               <Button
                 variant={viewMode === 'detailed' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setViewMode('detailed')}
                 className="flex items-center gap-2"
               >
                 <Eye className="w-4 h-4" />
                 Detailed Table
               </Button>
             </div>
           </CardTitle>
         </CardHeader>
       </Card>

             {/* Report Table */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center justify-between">
             <span>{viewMode === 'summary' ? 'Show-wise Summary' : 'Detailed Sales Report'}</span>
             {viewMode === 'summary' && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowDetails(!showDetails)}
               >
                 {showDetails ? 'Hide Details' : 'Show Details'}
               </Button>
             )}
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="overflow-x-auto">
             {viewMode === 'summary' ? (
               // Summary View
               <table className="w-full border-collapse border">
                 <thead>
                   <tr className="bg-gray-100">
                     <th className="border p-2 text-left">Show</th>
                     <th className="border p-2 text-center">Online Qty</th>
                     <th className="border p-2 text-center">BMS POS Qty</th>
                     <th className="border p-2 text-center">Counter Qty</th>
                     <th className="border p-2 text-center">Total Qty</th>
                     <th className="border p-2 text-center">Online Amt</th>
                     <th className="border p-2 text-center">BMS POS Amt</th>
                     <th className="border p-2 text-center">Counter Amt</th>
                     <th className="border p-2 text-center">Total Amt</th>
                   </tr>
                 </thead>
                 <tbody>
                   {showSummaries.map((summary, index) => (
                     <React.Fragment key={`summary-${summary.show}`}>
                       <tr className="hover:bg-gray-50">
                         <td className="border p-2 font-medium">{summary.show_label}</td>
                         <td className="border p-2 text-center">{summary.online_qty}</td>
                         <td className="border p-2 text-center">{summary.bms_pos_qty}</td>
                         <td className="border p-2 text-center">{summary.counter_qty}</td>
                         <td className="border p-2 text-center font-bold">{summary.total_qty}</td>
                         <td className="border p-2 text-center">₹{summary.online_amt.toLocaleString()}</td>
                         <td className="border p-2 text-center">₹{summary.bms_pos_amt.toLocaleString()}</td>
                         <td className="border p-2 text-center">₹{summary.counter_amt.toLocaleString()}</td>
                         <td className="border p-2 text-center font-bold">₹{summary.total_amt.toLocaleString()}</td>
                       </tr>
                       {showDetails && summary.classBreakdown.map((classData, classIndex) => (
                         <tr key={`${summary.show}-${classData.classLabel}-${classIndex}`} className="bg-gray-50">
                           <td className="border p-2 pl-8 text-sm">└ {classData.classLabel}</td>
                           <td className="border p-2 text-center text-sm">{classData.online_qty}</td>
                           <td className="border p-2 text-center text-sm">{classData.bms_pos_qty}</td>
                           <td className="border p-2 text-center text-sm">{classData.counter_qty}</td>
                           <td className="border p-2 text-center text-sm font-medium">{classData.total_qty}</td>
                           <td className="border p-2 text-center text-sm">₹{classData.online_amt.toLocaleString()}</td>
                           <td className="border p-2 text-center text-sm">₹{classData.bms_pos_amt.toLocaleString()}</td>
                           <td className="border p-2 text-center text-sm">₹{classData.counter_amt.toLocaleString()}</td>
                           <td className="border p-2 text-center text-sm font-medium">₹{classData.total_amt.toLocaleString()}</td>
                         </tr>
                       ))}
                     </React.Fragment>
                   ))}
                 </tbody>
               </table>
             ) : (
               // Detailed View - matches the image format
               <table className="w-full border-collapse border">
                 <thead>
                   <tr className="bg-gray-100">
                     <th className="border p-2 text-left">MOVIE DATE</th>
                     <th className="border p-2 text-left">MOVIE NAME</th>
                     <th className="border p-2 text-left">ScreenClass</th>
                     <th className="border p-2 text-center">ONLINE Qty</th>
                     <th className="border p-2 text-center">BMS POS QTY</th>
                     <th className="border p-2 text-center">COUNTER QTY</th>
                     <th className="border p-2 text-center">Total Qty</th>
                     <th className="border p-2 text-center">ONLINE AMT</th>
                     <th className="border p-2 text-center">BMS POS AMT</th>
                     <th className="border p-2 text-center">COUNTER AMT</th>
                     <th className="border p-2 text-center">Total AMT</th>
                   </tr>
                 </thead>
                 <tbody>
                   {salesData.map((item, index) => (
                     <tr key={`${item.show}-${item.classLabel}-${index}`} className="hover:bg-gray-50">
                       <td className="border p-2">{format(new Date(item.movie_date), 'dd-MMM-yyyy')}</td>
                       <td className="border p-2">{item.movie}</td>
                       <td className="border p-2">{item.classLabel}</td>
                       <td className="border p-2 text-center">{item.online_qty}</td>
                       <td className="border p-2 text-center">{item.bms_pos_qty}</td>
                       <td className="border p-2 text-center">{item.counter_qty}</td>
                       <td className="border p-2 text-center font-bold">{item.total_qty}</td>
                       <td className="border p-2 text-center">₹{item.online_amt.toFixed(2)}</td>
                       <td className="border p-2 text-center">₹{item.bms_pos_amt.toFixed(2)}</td>
                       <td className="border p-2 text-center">₹{item.counter_amt.toFixed(2)}</td>
                       <td className="border p-2 text-center font-bold">₹{item.total_amt.toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
         </CardContent>
       </Card>

      {/* Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={exportToExcel} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BoxVsOnlineReport; 