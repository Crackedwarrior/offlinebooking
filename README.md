AuditoriumX - Offline Movie Ticket Booking System 🎬🍿
Overview 🚀
Welcome to AuditoriumX, the ultimate offline movie ticket booking system built to handle the toughest cinema booking scenarios with style. Perfect for local theaters, small cinema chains, and those nostalgic for simpler times when the internet wasn’t a thing. Featuring a real-time seat booking system, automatic ticket printing, and robust reporting, AuditoriumX is a rock-solid solution for managing your movie theater—offline and with zero compromise on features.

This system is designed to be lightning-fast, bulletproof in handling large ticket volumes, and completely offline so that your booking process doesn't hinge on unreliable internet connections.

Why AuditoriumX? 🤔
Offline-First: Works even when the internet is down. Need we say more?

Real-Time Updates: No more “Whoops, this seat is already taken!” moments.

Seamless Integration: Easily integrates with external booking systems (BookMyShow, anyone?).

POS Printer Integration: Print tickets as soon as seats are booked (without the annoying setup hassle).

Endless Reports: The app keeps track of everything for you—no more digging through messy spreadsheets.

Database Persistence: Data sticks around, even if the app is uninstalled. That's right—it's like a superhero for your booking data.

Features ⚡
Real-Time Seat Selection: Seat booking updates instantly on every click. No more waiting for the refresh button.

Multiple Showtimes: Morning, matinee, evening, and night shows—AuditoriumX can handle them all.

Class-Based Pricing: Each seat class (BOX, STAR CLASS, CLASSIC) has its own pricing scheme. Price them like a boss!

BMS Integration: Already using an external booking system? No problem! AuditoriumX syncs seamlessly with third-party booking platforms.

Ticket Printing: The moment a seat is booked, the ticket prints automatically. Yes, it's that smooth.

Reporting & Analytics: Dive deep into your booking data with robust reports that include GST breakdowns, ticket revenue, seat occupancy, and more.

Database Persistence: Your data will survive app uninstallation. AuditoriumX ensures your data is stored locally and is always accessible.

Quick Start 🔥
Install Dependencies
Install all the dependencies required for both the frontend and backend.

bash
Copy
Edit
npm run install:all
Start the Application
Run the app in development mode and start both frontend and backend:

bash
Copy
Edit
npm run dev
Frontend: http://localhost:8080

Backend: http://localhost:3001

Start Booking Tickets
Select your seats, print tickets, and enjoy the smooth booking experience.

Features Deep Dive 🕵️‍♂️
🎟️ Booking System
Real-Time Updates: Book seats and watch them fill up in real-time.

Class-Based Pricing: BOX, STAR CLASS, and CLASSIC seats each have their own fixed pricing structure, and prices are customizable.

Multiple Showtimes: Add, manage, and book for multiple show times—morning to late-night.

BMS Integration: Sync your local bookings with external systems like BookMyShow without a hiccup.

🖨️ Ticket Printing
Automatic Ticket Generation: Once a seat is booked, the ticket prints. No more manual interventions.

Error Handling: If anything goes wrong with the print, the booking is rolled back automatically. No lost data!

📊 Reports & Analytics
Show-wise Reports: Daily reports for each show including seat occupancy, revenue breakdowns (net income, GST, MC).

Historical Data: Track past bookings, print dates, and make informed decisions.

PDF Exports: Export reports as PDFs for offline review or emailing.

🛠️ Development & Deployment
Backend: Node.js with Express. The backend API handles all business logic, including seat booking and report generation.

Frontend: React with TypeScript, powered by Shadcn UI for a sleek, responsive interface.

Desktop App: Powered by Tauri, the app can be compiled into a native executable for easy distribution.

⚙️ Configuration
Database
Persistence: Local SQLite database stores all booking data.

Location: The database is stored in %APPDATA%/AuditoriumX/database/ for persistence across app installations.

Backup: Automatic backup and restore ensure your booking data is safe.

🚀 Production Ready
The application is production-ready and fully optimized for offline environments. It's perfect for small-to-medium theaters, especially those that want a lightweight, cost-effective solution without relying on constant internet access.

🔧 Troubleshooting
Common Issues:

Printer not connected? Check USB or serial connection and confirm the COM port.

Backend not running? Run npm run dev:backend to start the server.

Frontend not loading? Try npm run dev:frontend to spin up the frontend.

📚 Documentation
Setup Guide: ENVIRONMENT_SETUP.md

API Documentation: API Documentation

Printing Setup: See PRINTING_SETUP.md for how to configure ticket printers.

Built with:
React for the frontend

TypeScript for type safety

Node.js & Express for the backend

Prisma & SQLite for local data management

Tauri for a slick desktop app

Shadcn UI for a responsive and modern user interface

Contribute 💪
Feel free to fork, clone, or submit a pull request! We'd love to have more features, bug fixes, and enhancements. Remember, contributors are like superheroes—they save the day!

👾 About the Author
Hey, I’m Ujwal Shetty - a passionate developer who likes building tools that actually solve problems. This project started as a way to help theaters go paperless (or more like "digital"?) with zero stress. Join the journey
