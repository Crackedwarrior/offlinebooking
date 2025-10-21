import express from 'express';
import { SeatController } from '../controllers/SeatController';
import { SeatService } from '../services/seatService';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { bmsLimiter } from '../server';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services and controllers
const seatService = new SeatService(prisma);
const seatController = new SeatController(seatService);

// Seat management routes
router.get('/status', asyncHandler(seatController.getStatus.bind(seatController)));
router.post('/bms', bmsLimiter, asyncHandler(seatController.saveBmsSeats.bind(seatController)));
router.post('/status', asyncHandler(seatController.updateStatus.bind(seatController)));

export default router;
