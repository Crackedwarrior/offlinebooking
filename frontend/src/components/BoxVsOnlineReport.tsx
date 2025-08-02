import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Download, FileText, RefreshCw, Eye } from 'lucide-react';
import { getBookings, getSeatStatus } from '@/services/api';
// import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SEAT_CLASSES, SHOW_TIMES } from '@/lib/config';
import type { Show } from '@/types/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useSettingsStore } from '@/store/settingsStore';

interface SalesData {
  movie_date: string;
  movie: string;
  show: string;
  show_label: string;
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Get settings store functions
  const { getMovieForShow } = useSettingsStore();

  // Get current date for "today" option
  const currentDate = new Date();
  const reportDate = format(selectedDate, 'yyyy-MM-dd');

  // Helper function to get movie name for a show
  const getMovieNameForShow = (show: string): string => {
    const movie = getMovieForShow(show);
    return movie ? movie.name : 'No Movie Assigned';
  };

  // Fetch sales data
  const fetchSalesData = async (date: string) => {
    setLoading(true);
    try {
      // Fetch bookings for each show to get different movie names
      const shows: Show[] = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
      console.log('🔍 Fetching bookings for shows:', shows);
      
      const bookingPromises = shows.map(show => 
        getBookings({ date, show }).catch(error => {
          console.warn(`Failed to fetch bookings for ${show}:`, error);
          return { success: false, data: null };
        })
      );
      
      const bookingResponses = await Promise.all(bookingPromises);
      let allBookings: any[] = [];
      
      bookingResponses.forEach((response, index) => {
        console.log(`📊 Bookings for ${shows[index]}:`, response);
        if (response.success && response.data) {
          console.log(`✅ Found ${response.data.length} bookings for ${shows[index]}:`, response.data);
          allBookings = allBookings.concat(response.data);
        } else {
          console.log(`❌ No bookings found for ${shows[index]}`);
        }
      });
      
      console.log('📋 Total bookings found:', allBookings);
      
      // Fetch seat status for all shows to get BMS seats with show information
        const seatStatusPromises = shows.map(show => 
          getSeatStatus({ date, show }).catch(error => {
            console.warn(`Failed to fetch seat status for ${show}:`, error);
            return { success: false, data: null };
          })
        );
        
        const seatStatusResponses = await Promise.all(seatStatusPromises);
        let allBmsSeats: any[] = [];
        
        seatStatusResponses.forEach((response, index) => {
        console.log(`🎫 Seat status for ${shows[index]}:`, response);
          if (response.success && response.data && response.data.bmsSeats) {
          // Add show information to each BMS seat
          const bmsSeatsWithShow = response.data.bmsSeats.map((bmsSeat: any) => ({
            ...bmsSeat,
            show: shows[index] // Associate the show with each BMS seat
          }));
          console.log(`✅ Found ${bmsSeatsWithShow.length} BMS seats for ${shows[index]}:`, bmsSeatsWithShow);
          allBmsSeats = allBmsSeats.concat(bmsSeatsWithShow);
        } else {
          console.log(`❌ No BMS seats found for ${shows[index]}`);
        }
      });
      
      console.log('🎫 Total BMS seats found:', allBmsSeats);
        
        // Process bookings and BMS seat data
      const processedData = processBookingsWithBMSSeats(allBookings, allBmsSeats, date);
      console.log('📊 Processed data:', processedData);
        setSalesData(processedData);
        
        // toast({
        //   title: 'Success',
        // description: `Data loaded for ${format(new Date(date), 'dd/MM/yyyy')}`,
        // });
    } catch (error) {
      console.error('❌ Error fetching sales data:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to load data. Please try again.',
      //   variant: 'destructive',
      // });
    } finally {
      setLoading(false);
    }
  };

  // Process bookings with BMS seats
  const processBookingsWithBMSSeats = (bookings: any[], bmsSeats: any[], date: string): SalesData[] => {
    console.log('🔄 Processing bookings:', bookings);
    console.log('🔄 Processing BMS seats:', bmsSeats);
    
    const salesDataMap = new Map<string, SalesData>();
    
    // Initialize all possible show-class combinations with zero values
    const allShows = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
    const allClasses = ['BOX', 'STAR CLASS', 'CLASSIC BALCONY', 'FIRST CLASS', 'SECOND CLASS'];
    
    allShows.forEach(show => {
      allClasses.forEach(classLabel => {
        const key = `${show}-${classLabel}`;
        const newEntry: SalesData = {
          movie_date: date,
          movie: getMovieNameForShow(show),
          show: show,
          show_label: getShowLabel(show),
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
        salesDataMap.set(key, newEntry);
      });
    });
    
    // Process regular bookings - use actual booking data
    bookings.forEach(booking => {
      console.log('📝 Processing booking:', booking);
      console.log('📝 Booking classLabel:', booking.classLabel);
      console.log('📝 Booking show:', booking.show);
      console.log('📝 Booking bookedSeats:', booking.bookedSeats);
      
      // Normalize classLabel to match our expected format
      let normalizedClassLabel = booking.classLabel;
      if (booking.classLabel === 'CLASSIC') {
        normalizedClassLabel = 'CLASSIC BALCONY';
        console.log('🔄 Normalized CLASSIC to CLASSIC BALCONY');
      } else if (booking.classLabel === 'SECOND CLASS') {
        normalizedClassLabel = 'SECOND CLASS';
        console.log('🔄 Normalized SECOND CLASS');
      } else if (booking.classLabel === 'STAR CLASS') {
        normalizedClassLabel = 'STAR CLASS';
        console.log('🔄 Normalized STAR CLASS');
      } else if (booking.classLabel === 'FIRST CLASS') {
        normalizedClassLabel = 'FIRST CLASS';
        console.log('🔄 Normalized FIRST CLASS');
      } else if (booking.classLabel === 'BOX') {
        normalizedClassLabel = 'BOX';
        console.log('🔄 Normalized BOX');
      }
      
      const key = `${booking.show}-${normalizedClassLabel}`;
      console.log('🔑 Booking key:', key);
      
      const existing = salesDataMap.get(key);
      
      if (existing) {
        console.log('📝 Updating existing entry for:', key);
        // Use actual movie name from booking data
        existing.movie = booking.movie || getMovieNameForShow(booking.show);
        existing.counter_qty += booking.bookedSeats?.length || 0;
        existing.counter_amt += booking.totalPrice || 0;
        existing.total_qty = existing.online_qty + existing.bms_pos_qty + existing.counter_qty;
        existing.total_amt = existing.online_amt + existing.bms_pos_amt + existing.counter_amt;
        console.log('📝 Updated entry:', existing);
      } else {
        console.log('❌ No existing entry found for key:', key);
        console.log('📝 Available keys in salesDataMap:', Array.from(salesDataMap.keys()));
      }
    });
    
    // Process BMS seats - use actual BMS data with show information
    bmsSeats.forEach(bmsSeat => {
      console.log('🎫 Processing BMS seat:', bmsSeat);
      
      // Use the show information that was added during data fetching
      const show = bmsSeat.show;
      const classLabel = extractClassFromSeatId(bmsSeat.seatId);
      const key = `${show}-${classLabel}`;
      console.log('🔑 BMS seat key:', key, 'show:', show, 'class:', classLabel);
      
      if (key) {
        const existing = salesDataMap.get(key);
        const price = getPriceForClass(classLabel);
        
        if (existing) {
          console.log('📝 Updating existing entry for BMS:', key);
          existing.bms_pos_qty += 1;
          existing.bms_pos_amt += price;
          existing.total_qty = existing.online_qty + existing.bms_pos_qty + existing.counter_qty;
          existing.total_amt = existing.online_amt + existing.bms_pos_amt + existing.counter_amt;
          
          // If this is a BMS booking, set movie name if not already set
          if (!existing.movie || existing.movie === 'No Movie Assigned') {
            existing.movie = getMovieNameForShow(show);
          }
        }
      }
    });
    
    const result = Array.from(salesDataMap.values());
    console.log('📊 Final processed data:', result);
    return result;
  };

  // Helper functions
  const extractShowFromSeatId = (seatId: string): string => {
    // This is a fallback function - BMS seats should have show info in the data
    // For now, we'll use a simple mapping based on seat patterns
    if (seatId.includes('MORNING') || seatId.includes('AM')) return 'MORNING';
    if (seatId.includes('MATINEE') || seatId.includes('PM1')) return 'MATINEE';
    if (seatId.includes('EVENING') || seatId.includes('PM2')) return 'EVENING';
    if (seatId.includes('NIGHT') || seatId.includes('PM3')) return 'NIGHT';
    
    // Default fallback - this should be improved based on actual seat ID patterns
    return 'EVENING';
  };

  const extractClassFromSeatId = (seatId: string): string => {
    const rowPrefix = seatId.split('-')[0];
    const classMapping: Record<string, string> = {
        'BOX': 'BOX',
        'SC': 'STAR CLASS',
      'CB': 'CLASSIC BALCONY',
        'FC': 'FIRST CLASS',
      'SEC': 'SECOND CLASS'
      };
    return classMapping[rowPrefix] || 'STAR CLASS';
  };

  const getPriceForClass = (classLabel: string): number => {
    const seatClass = SEAT_CLASSES.find(cls => cls.label === classLabel);
    return seatClass?.price || 150;
  };

  const getShowLabel = (show: string): string => {
    const showLabels: Record<string, string> = {
      'MORNING': '11:45 am',
      'MATINEE': '2:45 pm',
      'EVENING': '6:00 pm',
      'NIGHT': '9:30 pm'
    };
    return showLabels[show] || show;
  };

  // Calculate show summaries
  const showSummaries = useMemo(() => {
    // Initialize all possible shows with zero values
    const allShows = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
    const summaryMap = new Map<string, ShowSummary>();
    
    // Initialize all shows first
    allShows.forEach(show => {
      summaryMap.set(show, {
        show: show,
        show_label: getShowLabel(show),
           online_qty: 0,
           bms_pos_qty: 0,
           counter_qty: 0,
           total_qty: 0,
           online_amt: 0,
           bms_pos_amt: 0,
           counter_amt: 0,
           total_amt: 0,
           classBreakdown: []
      });
    });
    
    // Populate with actual data
    salesData.forEach(item => {
      const existing = summaryMap.get(item.show);
      if (existing) {
        existing.online_qty += item.online_qty;
        existing.bms_pos_qty += item.bms_pos_qty;
        existing.counter_qty += item.counter_qty;
        existing.total_qty += item.total_qty;
        existing.online_amt += item.online_amt;
        existing.bms_pos_amt += item.bms_pos_amt;
        existing.counter_amt += item.counter_amt;
        existing.total_amt += item.total_amt;
        existing.classBreakdown.push(item);
      }
    });
    
    // Sort shows chronologically: MORNING, MATINEE, EVENING, NIGHT
    const showOrder = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
    const sortedSummaries = Array.from(summaryMap.values()).sort((a, b) => {
      return showOrder.indexOf(a.show) - showOrder.indexOf(b.show);
    });
    
    return sortedSummaries;
  }, [salesData]);

  // Calculate grand total for the entire day
  const grandTotal = useMemo(() => {
    return showSummaries.reduce((total, summary) => ({
      online_qty: total.online_qty + summary.online_qty,
      bms_pos_qty: total.bms_pos_qty + summary.bms_pos_qty,
      counter_qty: total.counter_qty + summary.counter_qty,
      total_qty: total.total_qty + summary.total_qty,
      online_amt: total.online_amt + summary.online_amt,
      bms_pos_amt: total.bms_pos_amt + summary.bms_pos_amt,
      counter_amt: total.counter_amt + summary.counter_amt,
      total_amt: total.total_amt + summary.total_amt,
    }), {
      online_qty: 0,
      bms_pos_qty: 0,
      counter_qty: 0,
      total_qty: 0,
      online_amt: 0,
      bms_pos_amt: 0,
      counter_amt: 0,
      total_amt: 0,
    });
  }, [showSummaries]);

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Export functions
  const exportToExcel = () => {
    try {
      const csvContent = generateCSVContent();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `box_vs_online_report_${format(selectedDate, 'dd-MM-yyyy')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // toast({
      //   title: 'Success',
      //   description: 'Excel file downloaded successfully',
      // });
    } catch (error) {
      console.error('Export error:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to export file',
      //   variant: 'destructive',
      // });
    }
  };

  const generateCSVContent = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Create CSV header with report information
    const csvHeader = [
      ['BOX VS ONLINE SALE REPORT'],
      ['Sreelekha Theatre Chikmagaluru'],
      [`From ${format(selectedDate, 'dd/MM/yyyy')} Until ${format(nextDate, 'dd/MM/yyyy')}`],
      ['Report Type: Daily Sales Summary'],
      [`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [], // Empty row for spacing
      ['MOVIE DATE', 'MOVIE NAME', 'ScreenClass', 'ONLINE Qty', 'BMS POS Qty', 'COUNTER Qty', 'Total Qty', 'ONLINE AMT', 'BMS POS AMT', 'COUNTER AMT', 'Total AMT']
    ];
    
    // Create CSV data rows
    const csvData = [];
    
    // Add all show summaries with their class breakdowns
    showSummaries.forEach(summary => {
      // Add all class breakdown rows for this show first
      summary.classBreakdown.forEach(item => {
        csvData.push([
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
        ]);
      });
      
      // Add show total row after all class breakdowns
      csvData.push([
        format(new Date(selectedDate), 'dd-MMM-yyyy'),
        `Show Total (${summary.show_label})`,
        '',
        summary.online_qty,
        summary.bms_pos_qty,
        summary.counter_qty,
        summary.total_qty,
        summary.online_amt.toFixed(2),
        summary.bms_pos_amt.toFixed(2),
        summary.counter_amt.toFixed(2),
        summary.total_amt.toFixed(2)
      ]);
      
      // Add empty row for spacing between shows
      csvData.push([]);
    });
    
    // Add grand total row
    csvData.push([
      format(new Date(selectedDate), 'dd-MMM-yyyy'),
      'GRAND TOTAL (All Shows)',
      '',
      grandTotal.online_qty,
      grandTotal.bms_pos_qty,
      grandTotal.counter_qty,
      grandTotal.total_qty,
      grandTotal.online_amt.toFixed(2),
      grandTotal.bms_pos_amt.toFixed(2),
      grandTotal.counter_amt.toFixed(2),
      grandTotal.total_amt.toFixed(2)
    ]);
    
    // Add summary statistics
    csvData.push([]); // Empty row
    csvData.push(['DAILY SUMMARY']);
    csvData.push(['Total Tickets', grandTotal.total_qty]);
    csvData.push(['Total Revenue', `₹${grandTotal.total_amt.toFixed(2)}`]);
    csvData.push(['Active Shows', showSummaries.length]);
    csvData.push(['Online Sales', grandTotal.online_qty + grandTotal.bms_pos_qty]);
    
    // Add footer
    csvData.push([]); // Empty row
    csvData.push(['This report was generated automatically by Sreelekha Theatre Management System']);
    csvData.push(['For any queries, please contact the management team']);
    
    // Convert to CSV format
    const csvContent = [...csvHeader, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  };

  const exportToPDF = () => {
    try {
      const pdfContent = generatePDFContent();
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `box_vs_online_report_${format(selectedDate, 'dd-MM-yyyy')}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // toast({
      //   title: 'Success',
      //   description: 'PDF file downloaded successfully',
      // });
    } catch (error) {
      console.error('Export error:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to export file',
      //   variant: 'destructive',
      // });
    }
  };

  const generatePDFContent = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Box vs Online Sale Report</title>
        <style>
          @page {
            margin: 1in;
            size: A4;
          }
          
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0;
            color: #333;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .header h1 {
            color: #1e40af;
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header h2 {
            color: #374151;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 15px 0;
          }
          
          .header .date-range {
            background: #f3f4f6;
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
            font-weight: 500;
            color: #4b5563;
          }
          
          .report-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .report-info .generated {
            font-size: 12px;
            color: #6b7280;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          th {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            font-weight: 600;
            padding: 12px 8px;
            text-align: center;
            border: 1px solid #1e40af;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          th:first-child {
            text-align: left;
          }
          
          th:nth-child(2) {
            text-align: left;
          }
          
          th:nth-child(3) {
            text-align: left;
          }
          
          td {
            padding: 10px 8px;
            border: 1px solid #e5e7eb;
            text-align: center;
            vertical-align: middle;
          }
          
          td:first-child {
            text-align: left;
            font-weight: 500;
          }
          
          td:nth-child(2) {
            text-align: left;
            font-weight: 500;
          }
          
          td:nth-child(3) {
            text-align: left;
            font-weight: 500;
          }
          
          .show-total {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            font-weight: bold;
            color: #374151;
          }
          
          .show-total td {
            border: 1px solid #d1d5db;
          }
          
          .grand-total {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            font-weight: bold;
            font-size: 12px;
          }
          
          .grand-total td {
            border: 1px solid #059669;
            padding: 15px 8px;
          }
          
          .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-weight: 500;
          }
          
          .quantity {
            text-align: center;
            font-weight: 500;
          }
          
          .zero-value {
            color: #9ca3af;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          
          .summary-box {
            margin-top: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          
          .summary-box h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 14px;
            font-weight: 600;
          }
          
          .summary-stats {
            display: flex;
            justify-content: space-around;
            text-align: center;
          }
          
          .stat-item {
            padding: 10px;
          }
          
          .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
          }
          
          .stat-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Box vs Online Sale Report</h1>
          <h2>Sreelekha Theatre Chikmagaluru</h2>
          <div class="date-range">
            From ${format(selectedDate, 'dd/MM/yyyy')} Until ${format(nextDate, 'dd/MM/yyyy')}
          </div>
        </div>
        
        <div class="report-info">
          <div>
            <strong>Report Type:</strong> Daily Sales Summary
          </div>
          <div class="generated">
            Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
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
            ${showSummaries.map(summary => {
              let rows = '';
              
              // Add all class breakdown rows for this show first
              summary.classBreakdown.forEach(item => {
                const isZeroRow = item.total_qty === 0;
                rows += `
                  <tr class="${isZeroRow ? 'zero-value' : ''}">
                <td>${format(new Date(item.movie_date), 'dd-MMM-yyyy')}</td>
                <td>${item.movie}</td>
                <td>${item.classLabel}</td>
                    <td class="quantity">${item.online_qty}</td>
                    <td class="quantity">${item.bms_pos_qty}</td>
                    <td class="quantity">${item.counter_qty}</td>
                    <td class="quantity">${item.total_qty}</td>
                    <td class="amount">₹${item.online_amt.toFixed(2)}</td>
                    <td class="amount">₹${item.bms_pos_amt.toFixed(2)}</td>
                    <td class="amount">₹${item.counter_amt.toFixed(2)}</td>
                    <td class="amount">₹${item.total_amt.toFixed(2)}</td>
              </tr>
                `;
              });
              
              // Add show total row after all class breakdowns
              rows += `
                <tr class="show-total">
                  <td>${format(new Date(selectedDate), 'dd-MMM-yyyy')}</td>
                  <td>Show Total (${summary.show_label})</td>
                  <td></td>
                  <td class="quantity">${summary.online_qty}</td>
                  <td class="quantity">${summary.bms_pos_qty}</td>
                  <td class="quantity">${summary.counter_qty}</td>
                  <td class="quantity">${summary.total_qty}</td>
                  <td class="amount">₹${summary.online_amt.toFixed(2)}</td>
                  <td class="amount">₹${summary.bms_pos_amt.toFixed(2)}</td>
                  <td class="amount">₹${summary.counter_amt.toFixed(2)}</td>
                  <td class="amount">₹${summary.total_amt.toFixed(2)}</td>
                </tr>
              `;
              
              return rows;
            }).join('')}
            
            <!-- Grand Total Row -->
            <tr class="grand-total">
              <td>${format(new Date(selectedDate), 'dd-MMM-yyyy')}</td>
              <td>GRAND TOTAL (All Shows)</td>
              <td></td>
              <td class="quantity">${grandTotal.online_qty}</td>
              <td class="quantity">${grandTotal.bms_pos_qty}</td>
              <td class="quantity">${grandTotal.counter_qty}</td>
              <td class="quantity">${grandTotal.total_qty}</td>
              <td class="amount">₹${grandTotal.online_amt.toFixed(2)}</td>
              <td class="amount">₹${grandTotal.bms_pos_amt.toFixed(2)}</td>
              <td class="amount">₹${grandTotal.counter_amt.toFixed(2)}</td>
              <td class="amount">₹${grandTotal.total_amt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="summary-box">
          <h3>Daily Summary</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <div class="stat-value">${grandTotal.total_qty}</div>
              <div class="stat-label">Total Tickets</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">₹${grandTotal.total_amt.toFixed(2)}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${showSummaries.length}</div>
              <div class="stat-label">Active Shows</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${grandTotal.online_qty + grandTotal.bms_pos_qty}</div>
              <div class="stat-label">Online Sales</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>This report was generated automatically by Sreelekha Theatre Management System</p>
          <p>For any queries, please contact the management team</p>
        </div>
      </body>
      </html>
    `;
  };

  // Load data on component mount and date change
  useEffect(() => {
    fetchSalesData(reportDate);
  }, [reportDate]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Reports & Analytics</h1>
        <p className="text-lg text-gray-600">Sreelekha Theatre Chikmagaluru</p>
      </div>

      {/* Date Selection */}
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Select Date for Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(currentDate)}
                className={format(selectedDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') ? 'bg-blue-50 border-blue-200' : ''}
              >
                Today
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Or select custom date:</span>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxDate={new Date()}
              />
            </div>
            
            <Button
              onClick={() => fetchSalesData(reportDate)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card className="shadow-sm">
         <CardHeader>
          <CardTitle className="text-lg">Download Report</CardTitle>
         </CardHeader>
         <CardContent>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Download Box vs Online Sale Report for <span className="font-semibold">{format(selectedDate, 'dd/MM/yyyy')}</span>
            </p>
            <div className="flex gap-4 justify-center">
               <Button
                onClick={() => setPreviewOpen(true)} 
                variant="outline" 
                 className="flex items-center gap-2"
               >
                 <Eye className="w-4 h-4" />
                Preview Report
              </Button>
              <Button onClick={exportToExcel} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export to Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Download PDF
               </Button>
             </div>
          </div>
        </CardContent>
       </Card>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Box vs Online Sale Report</h2>
                <p className="text-gray-600">Sreelekha Theatre Chikmagaluru</p>
                <p className="text-sm text-gray-500">
                  From {format(selectedDate, 'dd/MM/yyyy')} Until {format(selectedDate, 'dd/MM/yyyy')}
                </p>
              </div>
               <Button
                onClick={() => setPreviewOpen(false)}
                 variant="outline"
                 size="sm"
               >
                Close
               </Button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
           <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                   <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left font-bold sticky left-0 bg-gray-100 z-20">MOVIE DATE</th>
                        <th className="border border-gray-300 p-3 text-left font-bold">MOVIE NAME</th>
                        <th className="border border-gray-300 p-3 text-left font-bold">ScreenClass</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">ONLINE Qty</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">BMS POS QTY</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">COUNTER Qty</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">Total Qty</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">ONLINE AMT</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">BMS POS AMT</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">COUNTER AMT</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">Total AMT</th>
                   </tr>
                 </thead>
                 <tbody>
                      {showSummaries.map((summary, summaryIndex) => (
                        <React.Fragment key={summary.show}>
                          {/* Class breakdown rows */}
                          {summary.classBreakdown.map((item, index) => (
                            <tr key={`${summary.show}-${item.classLabel}-${index}`} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 sticky left-0 bg-white z-10">
                                {format(new Date(item.movie_date), 'dd-MMM-yyyy')}
                              </td>
                              <td className="border border-gray-300 p-3">{item.movie}</td>
                              <td className="border border-gray-300 p-3">{item.classLabel}</td>
                              <td className="border border-gray-300 p-3 text-center">{item.online_qty}</td>
                              <td className="border border-gray-300 p-3 text-center">{item.bms_pos_qty}</td>
                              <td className="border border-gray-300 p-3 text-center">{item.counter_qty}</td>
                              <td className="border border-gray-300 p-3 text-center font-semibold">{item.total_qty}</td>
                              <td className="border border-gray-300 p-3 text-center">₹{item.online_amt.toFixed(2)}</td>
                              <td className="border border-gray-300 p-3 text-center">₹{item.bms_pos_amt.toFixed(2)}</td>
                              <td className="border border-gray-300 p-3 text-center">₹{item.counter_amt.toFixed(2)}</td>
                              <td className="border border-gray-300 p-3 text-center font-semibold">₹{item.total_amt.toFixed(2)}</td>
                         </tr>
                       ))}
                          {/* Show total row */}
                          <tr className="bg-gray-100 font-bold">
                            <td className="border border-gray-300 p-3 sticky left-0 bg-gray-100 z-10">
                              {format(selectedDate, 'dd-MMM-yyyy')}
                            </td>
                            <td className="border border-gray-300 p-3">
                              Show Total ({summary.show_label})
                            </td>
                            <td className="border border-gray-300 p-3"></td>
                            <td className="border border-gray-300 p-3 text-center">{summary.online_qty}</td>
                            <td className="border border-gray-300 p-3 text-center">{summary.bms_pos_qty}</td>
                            <td className="border border-gray-300 p-3 text-center">{summary.counter_qty}</td>
                            <td className="border border-gray-300 p-3 text-center">{summary.total_qty}</td>
                            <td className="border border-gray-300 p-3 text-center">₹{summary.online_amt.toFixed(2)}</td>
                            <td className="border border-gray-300 p-3 text-center">₹{summary.bms_pos_amt.toFixed(2)}</td>
                            <td className="border border-gray-300 p-3 text-center">₹{summary.counter_amt.toFixed(2)}</td>
                            <td className="border border-gray-300 p-3 text-center">₹{summary.total_amt.toFixed(2)}</td>
                          </tr>
                          {/* Add spacing between shows (except for the last one) */}
                          {summaryIndex < showSummaries.length - 1 && (
                            <tr>
                              <td colSpan={11} className="h-2 bg-gray-50"></td>
                            </tr>
                          )}
                     </React.Fragment>
                   ))}
                 </tbody>
               </table>
                </div>
              </div>
            </div>

            {/* Sticky Grand Total Row */}
            <div className="border-t bg-green-100 flex-shrink-0">
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                 <tbody>
                      <tr className="bg-green-100 font-bold text-green-800">
                        <td className="border border-gray-300 p-3">
                          {format(selectedDate, 'dd-MMM-yyyy')}
                        </td>
                        <td className="border border-gray-300 p-3">
                          GRAND TOTAL (All Shows)
                        </td>
                        <td className="border border-gray-300 p-3"></td>
                        <td className="border border-gray-300 p-3 text-center">{grandTotal.online_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">{grandTotal.bms_pos_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">{grandTotal.counter_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">{grandTotal.total_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{grandTotal.online_amt.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{grandTotal.bms_pos_amt.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{grandTotal.counter_amt.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{grandTotal.total_amt.toFixed(2)}</td>
                     </tr>
                 </tbody>
               </table>
           </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
            <Button onClick={exportToExcel} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxVsOnlineReport; 