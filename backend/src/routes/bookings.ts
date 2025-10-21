import express from 'express';
import { BookingController } from '../controllers/BookingController';
import { BookingService } from '../services/bookingService';
import { PrismaClient } from '@prisma/client';
import { validateBookingData, asyncHandler } from '../middleware/errorHandler';
import { bookingLimiter } from '../server';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services and controllers
const bookingService = new BookingService(prisma);
const bookingController = new BookingController(bookingService);

// Booking routes
router.post('/', bookingLimiter, validateBookingData, asyncHandler(bookingController.create.bind(bookingController)));
router.get('/', asyncHandler(bookingController.getAll.bind(bookingController)));
router.get('/stats', asyncHandler(bookingController.getStats.bind(bookingController)));
router.put('/:id', validateBookingData, asyncHandler(bookingController.update.bind(bookingController)));
router.patch('/:id/printed', asyncHandler(bookingController.markPrinted.bind(bookingController)));
router.delete('/:id', asyncHandler(bookingController.delete.bind(bookingController)));

export default router;
