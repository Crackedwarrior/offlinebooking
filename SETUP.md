# Offline Booking System - Setup Guide

## Quick Start

### 1. Environment Setup

The application requires environment variables to be configured. You can set them up automatically:

```bash
# Run the setup script
node setup-env.js
```

Or manually:

```bash
# Frontend
cd frontend
copy env.example .env

# Backend  
cd backend
copy env.example .env
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd backend
npm install
```

### 3. Database Setup

```bash
# Navigate to backend directory
cd backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 4. Start the Application

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend server  
cd frontend
npm run dev
```

The application should now be running at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001

## Environment Variables

### Frontend (.env)
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME="Offline Booking System"
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_OFFLINE_MODE=true
```

### Backend (.env)
```env
# Database Configuration
DATABASE_URL="file:./dev.db"

# Server Configuration
PORT=3001
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:8080

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# Feature Flags
ENABLE_SYNC_FEATURE=false
ENABLE_ANALYTICS=false
```

## Troubleshooting

### Environment Configuration Error
If you see the error "Missing required environment variables", it means the `.env` files are missing. Follow the setup steps above.

### Database Connection Issues
Make sure the database file exists and has proper permissions:
```bash
cd backend
npx prisma migrate reset
npx prisma generate
```

### Port Already in Use
If port 3001 or 8080 is already in use, you can change them in the respective `.env` files.

## Development

### Project Structure
```
offlinebooking/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express backend
├── scripts/           # Utility scripts
└── setup-env.js      # Environment setup script
```

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Start production server

## Features

- **Seat Booking**: Interactive seat grid with real-time status
- **Booking Management**: View, edit, and delete bookings
- **Reports**: Generate booking reports and analytics
- **Settings**: Configure movies, pricing, and show times
- **Offline Support**: Works without internet connection
- **BMS Integration**: Sync with BookMyShow data

## Support

If you encounter any issues, please check:
1. Environment variables are properly set
2. Database is initialized and migrated
3. Both frontend and backend servers are running
4. Console logs for detailed error messages 