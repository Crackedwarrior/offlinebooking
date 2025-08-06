# 🖨️ Printing System Setup Guide

## Overview
The AuditoriumX application now includes a complete printing system for the **Epson TM-T20 M249A POS printer**. The system automatically prints tickets when seats are booked and marks them as booked only after successful printing.

## 🚀 Quick Start

### 1. Start the Application
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:backend    # Backend on port 3001
npm run dev:frontend   # Frontend on port 8080
```

### 2. Access the Application
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001

### 3. Configure Printer Settings
1. Go to **Settings** → **Printer** tab
2. Configure your printer settings:
   - **Printer Port**: COM1 (or your printer's port)
   - **Theater Name**: SREELEKHA THEATER
   - **Location**: Chickmagalur
   - **GSTIN**: 29AAVFS7423E120
3. Click **"Test Connection"** to verify printer setup
4. Click **"Print Test"** to print a test ticket

## 🎫 How to Print Tickets

### Method 1: Through Seat Booking
1. Select seats on the main booking screen
2. Click **"Print"** button in the ticket panel
3. System will:
   - Generate ticket data in exact format
   - Send to printer via backend API
   - Mark seats as booked only after successful printing
   - Show success/error messages

### Method 2: Test Printing
1. Go to **Settings** → **Printer**
2. Click **"Print Test"** to print a sample ticket
3. Verify the ticket format matches your requirements

## 📋 Ticket Format

The system generates tickets in this exact format:

```
SREELEKHA THEATER
Chickmagalur
Date : 06/08/2025
Film : Mahavatar Narsimha
Class : STAR
SHOWTIME: 02:45 PM
Row: A-Seats: [18]
[NET:125.12] [CGST:11.44] [SGST:11.44] [MC:2.00]
06/08/2025 / 02:45 PM 060812CSH 00290001/001
Ticket Cost: 150.00
```

## ⚙️ Configuration Options

### Printer Settings
- **Port**: COM1, COM2, etc. (for USB/Serial printers)
- **Baud Rate**: 9600 (default for Epson TM-T20)
- **Theater Name**: Customizable theater name
- **Location**: Theater location
- **GSTIN**: Your GST registration number

### GST Calculation
- **GST Rate**: 18% (automatically calculated)
- **CGST**: 9% (Central GST)
- **SGST**: 9% (State GST)
- **MC**: ₹2.00 (Municipal Corporation charge)

### Transaction IDs
- **Format**: `DDMMHHCSH RRRR0001/001`
- **Example**: `060812CSH 00290001/001`
- **Auto-generated** for each ticket

## 🔧 Technical Implementation

### Frontend Components
- **`printerService.ts`**: Main printing service
- **`PrinterConfig.tsx`**: Printer configuration UI
- **`TicketPrint.tsx`**: Enhanced with printing functionality

### Backend API Endpoints
- **`POST /api/printer/test`**: Test printer connection
- **`POST /api/printer/print`**: Print tickets
- **`GET /health`**: Backend health check

### ESC/POS Commands
The system generates proper ESC/POS commands for the Epson printer:
```javascript
'\x1B\x40'    // Initialize printer
'\x1B\x61\x01' // Center alignment
'\x1B\x21\x10' // Double height and width
'\x1B\x69'    // Cut paper
```

## 🖥️ Desktop App Integration

### Tauri Desktop App
The printing system works seamlessly with the Tauri desktop app:

```bash
# Build desktop app
npm run tauri:build

# Development mode
npm run tauri:dev
```

### Database Persistence
- Database stored in `%APPDATA%/AuditoriumX/database/`
- Persists when app is uninstalled
- Automatic backup and restore

## 🐛 Troubleshooting

### Common Issues

#### 1. Printer Not Connected
**Symptoms**: "Printer connection test failed"
**Solutions**:
- Check USB/Serial connection
- Verify correct COM port
- Install printer drivers
- Test with Windows Device Manager

#### 2. Backend Not Running
**Symptoms**: "Failed to fetch" errors
**Solutions**:
```bash
# Check if backend is running
curl http://localhost:3001/health

# Restart backend
npm run dev:backend
```

#### 3. Frontend Not Loading
**Symptoms**: Blank page or connection errors
**Solutions**:
```bash
# Check if frontend is running
curl http://localhost:8080

# Restart frontend
npm run dev:frontend
```

### Debug Mode
Enable debug logging in browser console:
1. Open Developer Tools (F12)
2. Check Console tab
3. Look for printer-related logs:
   - `🖨️ Printing ticket:`
   - `📤 Sending to printer via backend API`
   - `✅ Ticket printed successfully`

## 🔄 Workflow Summary

### Print-First Booking Process
1. **User selects seats** → Seats appear in ticket panel
2. **User clicks "Print"** → System prepares ticket data
3. **Printing attempt** → ESC/POS commands sent to printer
4. **Success check** → If printing succeeds, proceed to step 5
5. **Database update** → Save booking and mark seats as booked
6. **UI update** → Refresh seat grid to show booked status

### Error Handling
- **Printing fails** → Seats remain unbooked
- **Database fails** → Show error message, seats unbooked
- **Network issues** → Retry mechanism with user feedback

## 📞 Support

### Testing the System
```bash
# Run comprehensive test
node test-printing.js

# Check server status
curl http://localhost:3001/health
```

### Logs Location
- **Frontend logs**: Browser console (F12)
- **Backend logs**: Terminal where `npm run dev:backend` is running
- **Desktop app logs**: Application console

## 🎯 Ready to Use!

The printing system is now fully integrated and ready for production use. The application will:

✅ **Print tickets automatically** when seats are booked  
✅ **Mark seats as booked** only after successful printing  
✅ **Generate proper GST calculations**  
✅ **Create unique transaction IDs**  
✅ **Handle errors gracefully**  
✅ **Work in both web and desktop modes**  

**Next Steps**: Connect your Epson TM-T20 M249A printer and start booking tickets! 