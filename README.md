

# **AuditoriumX - Offline Movie Ticket Booking System** 🎬🍿

## **Overview** 🚀

**AuditoriumX** is a **high-performance offline movie ticket booking system** built to handle **real-time seat booking**, **automatic ticket printing**, and **robust reporting**. This system is designed for **local theaters**, **small cinema chains**, and venues that need an **offline-first solution** to manage ticket bookings efficiently without relying on the internet.

---

## **Key Features** ⚡

* **Offline-First**: Operates fully without the internet. Perfect for **local setups**.
* **Real-Time Seat Booking**: Instantly updates available seats as they are booked. No more "**Oops, that seat is taken!**"
* **POS Integration**: Prints tickets automatically on **POS printers** when seats are booked.
* **BMS Integration**: Syncs seamlessly with external booking systems.
* **Reports & Analytics**: Generate detailed reports on bookings, revenue, and GST.
* **Database Persistence**: Booking data is saved locally in **SQLite**, even if the app is uninstalled.

---

## **Tech Stack & Tools** 🔧

* **Frontend**: **React** + **TypeScript** with **Shadcn UI** for a clean, modern UI.
* **Backend**: **Node.js** + **Express** for handling all the booking logic and interactions.
* **Database**: **Prisma ORM** with **SQLite** for local storage.
* **Desktop App**: **Tauri** for packaging the app as a native desktop application.
* **POS Printing**: Integrates with POS printers using **ESC/POS commands**.

---

## **Quick Setup** 🔥

1. **Install Dependencies**:

   ```bash
   npm run install:all
   ```

2. **Start the Application**:

   ```bash
   npm run dev
   ```

   * **Frontend**: [http://localhost:8080](http://localhost:8080)
   * **Backend**: [http://localhost:3001](http://localhost:3001)

3. **Start Booking**:

   * Select seats.
   * Click "**Print**" to print tickets.
   * **All bookings are saved automatically**.

---

## **How It Works** 🛠️

* **Seat Booking**: Choose a seat, and it's instantly marked as booked in the system.
* **POS Integration**: Once seats are booked, **tickets are printed automatically** using ESC/POS commands.
* **Reports**: Generate **PDF reports** for show data, bookings, and revenue.
* **Offline Support**: Everything works without an internet connection, ensuring uninterrupted operation.

---

## **Production-Ready** ✅

* Fully tested and deployed to work in **offline environments**.
* **No external dependencies**—everything runs locally.
* **No internet? No problem!** This system is perfect for **small and medium-scale theaters** looking for a reliable, offline ticket booking solution.

---

## **About** 👾

**Crackedwarrior** developed **AuditoriumX** to provide a **simple, reliable, and offline-first solution** for cinema ticketing. Built to ensure **seamless performance**, even in low or no internet environments, this tool helps manage theater bookings with ease.
