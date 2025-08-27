# Offline Booking App – Theatre Counter Software

This is a desktop booking application built for a local theatre to handle offline ticket bookings at the counter, working in parallel with BookMyShow for online tickets.

The app is optimized for non-tech-savvy staff, with a simple one-click kiosk-style interface and PDF reporting. It is designed to work offline-first, with optional cloud sync for backup and archival.

---

## Features

### Booking Interface
- Fixed seat matrix based on the real theatre layout
- Color-coded seat states:
  - Green: Available
  - Red: Booked (Offline)
  - Yellow: Blocked (VIP/Management)
  - Blue: BMS Booked (Online, manually marked)
- Click to toggle seat state
- Unblock, rebook, and manually mark BMS seats
- Gaps and walking space preserved as per layout

### Show & Date Selection
- Calendar-based date selector
- Show dropdown with Morning, Matinee, Evening, and Night
- Screen is hardcoded as “Screen 1”

### Daily Reports
- Export per-show seat status as PDF
- Includes:
  - Booked seats
  - Blocked seats
  - BMS-marked seats
  - Total count for the show

### Booking History
- Load any past date's booking
- View seat map and summary
- Export previous reports again as PDF

### Offline-First with Cloud Sync
- Uses local SQLite for fast, offline use
- Syncs to MongoDB Atlas cloud database (free tier) when internet is available
- Cloud sync is append-only (no deletion/overwrite allowed)
- Data is preserved even if the local database is lost

---

## Tech Stack

| Layer        | Technology                   |
|--------------|------------------------------|
| Frontend     | React + Tailwind CSS         |
| Backend      | Node.js (Electron wrapper)   |
| Local DB     | SQLite (offline-first)       |
| Cloud Backup | MongoDB Atlas (512MB free)   |
| PDF Reports  | pdf-lib or jspdf             |
| State Mgmt   | useState / Zustand           |
| UI Builder   | Lovable AI + Cursor editor   |

---

## Final Output

A full-screen, installable desktop `.exe` app built using Electron, meant for theatre counter usage. It requires no internet access to function and offers fast local response with optional cloud backup.

---

## Folder Structure (Work in Progress)

offlinebooking/
├── public/
├── src/
│ ├── components/
│ │ ├── SeatGrid.jsx
│ │ ├── ShowSelector.jsx
│ │ ├── HistoryView.jsx
│ │ └── ControlsPanel.jsx
│ ├── lib/
│ │ └── pdfUtils.js
│ ├── App.jsx
│ └── main.jsx
├── electron/
└── package.json

---

## Licensing

This project is developed for private, controlled usage by authorized theatre staff only.  
All rights reserved © Crackedwarrior. Redistribution or modification without permission is strictly prohibited.

---

## Project Status

- [x] Seat matrix finalized (based on physical layout)
- [x] UI built using Lovable AI and Cursor
- [x] Core frontend functionality complete
- [ ] PDF generation logic (in progress)
- [ ] Electron `.exe` build
- [ ] Full database integration and sync

---

## Contact

Built and maintained by [@Crackedwarrior](https://github.com/Crackedwarrior)  
For support or customization inquiries, contact directly via GitHub or email.
