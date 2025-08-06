# 🎬 AuditoriumX - Offline Movie Ticket Booking System

A comprehensive offline movie ticket booking system with **integrated POS printer support** for the Epson TM-T20 M249A printer.

## 🚀 Current Status: **READY FOR PRODUCTION**

### ✅ **Fully Implemented Features:**
- **Seat Booking System** with real-time updates
- **BMS Integration** for external booking management
- **PDF Generation** for tickets and reports
- **🖨️ POS Printer Integration** (NEW!)
- **Desktop App** using Tauri
- **Database Persistence** across app installations
- **GST Calculation** and proper tax handling
- **Booking History** and management
- **Reports** and analytics

## 🖨️ **Printing System - READY TO USE**

The application now includes a complete printing system that:

### **Key Features:**
- ✅ **Automatic ticket printing** when seats are booked
- ✅ **Print-first workflow** - seats only marked as booked after successful printing
- ✅ **Exact ticket format** matching your sample ticket
- ✅ **GST calculations** (NET, CGST, SGST, MC)
- ✅ **Unique transaction IDs** for each ticket
- ✅ **Epson TM-T20 M249A** compatibility
- ✅ **Error handling** and rollback on printing failures

### **Ticket Format:**
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

## 🚀 Quick Start

### **1. Start the Application**
```bash
# Install dependencies
npm run install:all

# Start both frontend and backend
npm run dev
```

### **2. Access the Application**
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001

### **3. Configure Printer**
1. Go to **Settings** → **Printer** tab
2. Configure your Epson TM-T20 M249A settings
3. Test connection and print a test ticket

### **4. Start Booking Tickets**
1. Select seats on the main screen
2. Click **"Print"** to print tickets and mark seats as booked
3. View booking history and reports

## 🖥️ Desktop App

### **Build Desktop App**
```bash
# Development mode
npm run tauri:dev

# Production build
npm run tauri:build
```

### **Generated Files:**
- **Executable**: `frontend/src-tauri/target/release/app.exe`
- **MSI Installer**: `frontend/src-tauri/target/release/bundle/msi/AuditoriumX_0.1.0_x64_en-US.msi`
- **NSIS Installer**: `frontend/src-tauri/target/release/bundle/nsis/AuditoriumX_0.1.0_x64-setup.exe`

## 📋 Available Scripts

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start frontend only
npm run dev:backend           # Start backend only

# Desktop App
npm run tauri:dev             # Development mode
npm run tauri:build           # Production build

# Utilities
npm run install:all           # Install all dependencies
npm start                     # Start backend server
```

## 🔧 Configuration

### **Printer Settings** (Settings → Printer)
- **Port**: COM1 (configurable)
- **Theater Name**: SREELEKHA THEATER
- **Location**: Chickmagalur
- **GSTIN**: 29AAVFS7423E120

### **Database**
- **Location**: `%APPDATA%/AuditoriumX/database/` (desktop app)
- **Persistence**: Survives app uninstallation
- **Backup**: Automatic backup and restore

## 📊 Features Overview

### **Booking System**
- Real-time seat selection
- Multiple show times (Morning, Matinee, Evening, Night)
- Class-based pricing (BOX, STAR CLASS, CLASSIC, etc.)
- BMS integration for external bookings

### **Printing System**
- ESC/POS commands for Epson printers
- Automatic GST calculation
- Transaction ID generation
- Print-first booking workflow

### **Management**
- Booking history and search
- Reports and analytics
- Movie management
- Price configuration

### **Desktop Integration**
- Native Windows application
- Database persistence
- Offline functionality
- Professional installer

## 🐛 Troubleshooting

### **Common Issues**
1. **Printer not connected**: Check USB/Serial connection and COM port
2. **Backend not running**: Run `npm run dev:backend`
3. **Frontend not loading**: Run `npm run dev:frontend`

### **Testing**
```bash
# Test printing functionality
node test-printing.js

# Check server health
curl http://localhost:3001/health
```

## 📚 Documentation

- **Printing Setup**: See `PRINTING_SETUP.md` for detailed printer configuration
- **Environment Setup**: See `ENVIRONMENT_SETUP.md` for development setup
- **API Documentation**: Backend API endpoints and usage

## 🎯 Production Ready

The application is now **fully ready for production use** with:

✅ **Complete booking system**  
✅ **Integrated POS printing**  
✅ **Desktop application**  
✅ **Database persistence**  
✅ **Error handling**  
✅ **Professional UI/UX**  

**Next Steps**: Connect your Epson TM-T20 M249A printer and start booking tickets!

---

**Built with**: React, TypeScript, Node.js, Express, Prisma, SQLite, Tauri, Shadcn UI 