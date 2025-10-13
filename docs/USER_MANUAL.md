# AuditoriumX User Manual
## Professional Theater Booking System

**Version:** 1.0.4  
**Last Updated:** September 28, 2025

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [System Overview](#system-overview)
3. [Daily Operations](#daily-operations)
4. [Settings & Configuration](#settings--configuration)
5. [Reports & Analytics](#reports--analytics)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Features](#advanced-features)

---

## 🚀 Getting Started

### System Requirements
- **Operating System:** Windows 10/11
- **RAM:** Minimum 4GB (8GB recommended)
- **Storage:** 500MB free space
- **Printer:** Thermal receipt printer (EPSON TM-T81 recommended)

### Installation
1. Run the `AuditoriumX-v1.0.4-SeatDataFixed.exe` installer
2. Follow the installation wizard
3. The system will automatically configure itself
4. Launch AuditoriumX from the desktop shortcut

### First Time Setup
1. **Configure Theater Settings:**
   - Go to Settings → Overview
   - Verify theater name: "SREELEKHA THEATER"
   - Verify location: "Chikmagalur"
   - Verify GSTIN: "29AAVFS7423E120"

2. **Set Up Show Times:**
   - Go to Settings → Show Times
   - Default shows: Morning, Matinee, Evening, Night
   - Modify times as needed for your theater

3. **Configure Pricing:**
   - Go to Settings → Pricing
   - Set prices for each seat class (BOX, STAR CLASS, etc.)

4. **Test Printer:**
   - Go to Settings → Printer
   - Test print a sample ticket
   - Ensure printer is working correctly

---

## 🎬 System Overview

### Main Interface
The AuditoriumX interface consists of:

1. **Navigation Sidebar:** Quick access to all features
2. **Main Content Area:** Current operation interface
3. **Status Bar:** System status and notifications

### Key Features
- **Real-time Seat Management:** Live seat availability
- **Multiple Show Support:** Morning, Matinee, Evening, Night shows
- **Flexible Pricing:** Different prices for different seat classes
- **Ticket Printing:** Thermal and PDF ticket printing
- **Booking Management:** Complete booking lifecycle
- **Reports & Analytics:** Daily, weekly, monthly reports
- **Offline Operation:** No internet required

---

## 📅 Daily Operations

### Starting Your Day
1. **Launch AuditoriumX**
2. **Check System Status:** Ensure all systems are green
3. **Verify Show Times:** Confirm today's show schedule
4. **Test Printer:** Print a test ticket to ensure printer works

### Creating a Booking

#### Step 1: Select Show Details
1. Click **"New Booking"** or use the main interface
2. Select **Date** (defaults to today)
3. Select **Show Time** (Morning/Matinee/Evening/Night)
4. Select **Movie** from the dropdown
5. Click **"Select Seats"**

#### Step 2: Choose Seats
1. **Seat Grid** displays all available seats
2. **Green seats** = Available
3. **Red seats** = Already booked
4. **Click seats** to select them
5. **Seat classes** are color-coded:
   - **BOX** = Premium seats
   - **STAR CLASS** = Standard seats
6. **Selected seats** appear in the right panel
7. Click **"Proceed to Checkout"**

#### Step 3: Customer Information
1. **Customer Details** (optional):
   - Name
   - Phone number
   - Email address
2. **Booking Summary** shows:
   - Selected seats
   - Individual prices
   - Total amount
   - Tax breakdown
3. Click **"Confirm Booking"**

#### Step 4: Print Ticket
1. **Ticket Preview** appears
2. **Automatic Printing:** Ticket prints automatically
3. **Manual Print:** Click "Print Again" if needed
4. **Booking Complete:** Customer receives ticket

### Managing Existing Bookings

#### View Bookings
1. Go to **"Bookings"** tab
2. **Filter by:**
   - Date
   - Show time
   - Status
3. **View Details:** Click on any booking

#### Modify Booking
1. **Find the booking** in the bookings list
2. **Click "Edit"** button
3. **Make changes:**
   - Customer information
   - Seat changes (if available)
   - Status updates
4. **Save changes**

#### Cancel Booking
1. **Find the booking** to cancel
2. **Click "Cancel"** button
3. **Confirm cancellation**
4. **Seats become available** for rebooking

---

## ⚙️ Settings & Configuration

### Theater Configuration
**Location:** Settings → Overview

#### Basic Information
- **Theater Name:** SREELEKHA THEATER
- **Location:** Chikmagalur
- **GSTIN:** 29AAVFS7423E120

#### Seat Configuration
- **Total Seats:** Automatically calculated
- **Seat Classes:** BOX, STAR CLASS
- **Seat Distribution:** Shows seats per class

### Show Time Management
**Location:** Settings → Show Times

#### Default Show Times
- **Morning Show:** 11:45 AM - 2:45 PM
- **Matinee Show:** 3:00 PM - 6:00 PM
- **Evening Show:** 6:30 PM - 9:30 PM
- **Night Show:** 10:00 PM - 1:00 AM

#### Adding Custom Show Times
1. **Click "Add Show Time"**
2. **Enter Details:**
   - **Show Key:** Uppercase identifier (e.g., SPECIAL)
   - **Show Label:** Display name (e.g., Special Show)
   - **Start Time:** HH:MM format (24-hour)
   - **End Time:** HH:MM format (24-hour)
3. **Click "Add Show Time"**

#### Modifying Show Times
1. **Find the show** to modify
2. **Click "Edit"** button
3. **Update times** as needed
4. **Save changes**

### Pricing Configuration
**Location:** Settings → Pricing

#### Setting Prices
1. **Select Seat Class** (BOX, STAR CLASS)
2. **Enter Price** for that class
3. **Prices are applied** to all seats in that class
4. **Tax calculation** is automatic

#### Price Structure
- **BOX Seats:** Premium pricing
- **STAR CLASS Seats:** Standard pricing
- **Tax Breakdown:**
  - NET Amount
  - CGST (Central GST)
  - SGST (State GST)
  - MC (Municipal Corporation)
  - **Total Amount**

### Movie Management
**Location:** Settings → Movies

#### Adding Movies
1. **Click "Add Movie"**
2. **Enter Details:**
   - **Movie Name**
   - **Language** (Hindi, English, Telugu, etc.)
   - **Screen** (Screen 1, Screen 2, etc.)
   - **Show Assignments** (which shows will play this movie)
3. **Click "Add Movie"**

#### Managing Movies
- **Edit Movie:** Click edit button
- **Delete Movie:** Click delete button
- **Show Conflicts:** System warns about scheduling conflicts

### Printer Configuration
**Location:** Settings → Printer

#### Printer Setup
1. **Select Printer:** Choose your thermal printer
2. **Test Print:** Print a sample ticket
3. **Adjust Settings:** Paper size, print quality
4. **Save Configuration**

#### Supported Printers
- **EPSON TM-T81** (Recommended)
- **Other Thermal Printers** (with ESC/POS support)
- **PDF Printing** (for backup)

---

## 📊 Reports & Analytics

### Daily Reports
**Location:** Reports → Daily Summary

#### Booking Statistics
- **Total Bookings:** Number of bookings today
- **Total Revenue:** Total income for the day
- **Average Booking Value:** Average ticket price
- **Occupancy Rate:** Percentage of seats sold

#### Show-wise Breakdown
- **Morning Show:** Bookings and revenue
- **Matinee Show:** Bookings and revenue
- **Evening Show:** Bookings and revenue
- **Night Show:** Bookings and revenue

#### Seat Class Analysis
- **BOX Seats:** Sales and revenue
- **STAR CLASS Seats:** Sales and revenue
- **Revenue Distribution:** Visual charts

### Weekly Reports
**Location:** Reports → Weekly Summary

#### Weekly Trends
- **Day-wise Performance:** Monday through Sunday
- **Peak Days:** Highest revenue days
- **Low Days:** Days with low bookings
- **Trend Analysis:** Week-over-week comparison

### Monthly Reports
**Location:** Reports → Monthly Summary

#### Monthly Overview
- **Total Revenue:** Monthly income
- **Booking Trends:** Month-over-month growth
- **Seasonal Analysis:** Peak and off-peak periods
- **Performance Metrics:** Key performance indicators

---

## 🔧 Troubleshooting

### Common Issues

#### Printer Not Working
**Symptoms:** Tickets not printing
**Solutions:**
1. **Check Printer Connection:** Ensure USB cable is connected
2. **Check Printer Status:** Go to Settings → Printer
3. **Test Print:** Try printing a test ticket
4. **Restart Printer:** Turn off and on the printer
5. **Check Paper:** Ensure thermal paper is loaded

#### Seats Not Updating
**Symptoms:** Seats showing as available when booked
**Solutions:**
1. **Refresh Page:** Press F5 or reload the application
2. **Check Booking Status:** Verify booking was created
3. **Restart Application:** Close and reopen AuditoriumX
4. **Check Database:** Contact technical support

#### Slow Performance
**Symptoms:** Application running slowly
**Solutions:**
1. **Close Other Applications:** Free up system resources
2. **Restart Application:** Close and reopen AuditoriumX
3. **Check Database Size:** Large databases may slow down
4. **System Maintenance:** Restart computer if needed

#### Booking Errors
**Symptoms:** Cannot create bookings
**Solutions:**
1. **Check Required Fields:** Ensure all required information is entered
2. **Verify Seat Availability:** Check if seats are actually available
3. **Check Show Times:** Ensure show time is valid
4. **Restart Application:** Close and reopen if issues persist

### Error Messages

#### "Show time key already exists"
**Meaning:** You're trying to add a show time with a key that already exists
**Solution:** Use a different key or modify the existing show time

#### "Seat already booked"
**Meaning:** Someone else booked the seat while you were selecting
**Solution:** Choose different seats

#### "Printer not found"
**Meaning:** The selected printer is not available
**Solution:** Check printer connection and select correct printer

#### "Invalid time format"
**Meaning:** Time entered is not in correct HH:MM format
**Solution:** Use 24-hour format (e.g., 15:30 for 3:30 PM)

### Getting Help

#### Self-Service
1. **Check this manual** for common solutions
2. **Use built-in help** in the application
3. **Check system logs** for error details

#### Technical Support
- **Version:** 1.0.4
- **System Logs:** Available in Settings → System
- **Error Reporting:** Built-in error reporting system

---

## 🚀 Advanced Features

### Booking Management
**Location:** Settings → Bookings

#### Load Bookings
1. **Select Date:** Choose the date to view
2. **Select Show:** Choose specific show or all shows
3. **Click "Load Bookings"**
4. **View Results:** All bookings for that date/show

#### Booking Operations
- **View Details:** Click on any booking
- **Edit Booking:** Modify customer information
- **Cancel Booking:** Cancel and free up seats
- **Print Ticket:** Reprint ticket if needed

### Ticket ID Management
**Location:** Settings → Bookings

#### Current Ticket ID
- **Display:** Shows current ticket number
- **Format:** TKT000005 (prefix + padded number)
- **Auto-increment:** Automatically increases with each booking

#### Reset Ticket ID
1. **Enter New Number:** Set starting ticket number
2. **Click "Reset Ticket ID"**
3. **Confirm Reset:** Confirm the change
4. **New Tickets:** Will start from the new number

### Data Backup
**Location:** Settings → System

#### Automatic Backup
- **Database Backup:** Automatic daily backups
- **Backup Location:** User data directory
- **Backup Retention:** 30 days of backups

#### Manual Backup
1. **Click "Create Backup"**
2. **Choose Location:** Select backup folder
3. **Backup Complete:** Database saved to file

### System Maintenance

#### Database Optimization
- **Automatic:** System optimizes database automatically
- **Manual:** Available in Settings → System
- **Performance:** Improves application speed

#### Log Management
- **System Logs:** Application and error logs
- **Audit Logs:** Security and operation logs
- **Log Rotation:** Automatic log file management

---

## 📞 Support & Contact

### System Information
- **Application:** AuditoriumX Professional Theater Booking System
- **Version:** 1.0.4
- **Platform:** Windows Desktop Application
- **Database:** SQLite (local, no server required)

### Technical Specifications
- **Frontend:** React + TypeScript
- **Backend:** Node.js + Express
- **Database:** SQLite with Prisma ORM
- **Desktop:** Electron framework
- **Printing:** ESC/POS thermal printing

### Performance Metrics
- **Database Size:** ~1KB per booking (very efficient)
- **Memory Usage:** ~200MB typical usage
- **Startup Time:** ~5 seconds
- **Booking Creation:** <1 second
- **Report Generation:** <3 seconds

---

## 📋 Quick Reference

### Keyboard Shortcuts
- **F5:** Refresh current page
- **Ctrl+N:** New booking
- **Ctrl+P:** Print ticket
- **Ctrl+S:** Save settings
- **Esc:** Cancel current operation

### Default Settings
- **Theater:** SREELEKHA THEATER, Chikmagalur
- **GSTIN:** 29AAVFS7423E120
- **Show Times:** 4 standard shows
- **Seat Classes:** BOX, STAR CLASS
- **Ticket Format:** Thermal receipt

### File Locations
- **Application:** Program Files/AuditoriumX
- **Database:** AppData/Roaming/auditoriumx/database
- **Logs:** AppData/Roaming/auditoriumx/logs
- **Backups:** AppData/Roaming/auditoriumx/backups

---

*This manual covers all features of AuditoriumX v1.0.4. For the most up-to-date information, refer to the built-in help system within the application.*

**© 2025 AuditoriumX - Professional Theater Booking System**
