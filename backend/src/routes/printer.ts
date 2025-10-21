import express from 'express';
import { PrinterController } from '../controllers/PrinterController';
import { asyncHandler } from '../middleware/errorHandler';
import { bookingLimiter } from '../server';

const router = express.Router();

// Initialize controller
const printerController = new PrinterController();

// Thermal printer routes (MUST come first - more specific)
router.get('/thermal-printer/list', asyncHandler(printerController.getThermalList.bind(printerController)));
router.post('/thermal-printer/test', asyncHandler(printerController.testThermal.bind(printerController)));
router.post('/thermal-printer/print', asyncHandler(printerController.printThermal.bind(printerController)));

// Generic printer routes (MUST come after specific routes)
router.post('/print', bookingLimiter, asyncHandler(printerController.print.bind(printerController)));
router.get('/list', asyncHandler(printerController.list.bind(printerController)));
router.post('/test', asyncHandler(printerController.test.bind(printerController)));
router.get('/status/:jobId', asyncHandler(printerController.getStatus.bind(printerController)));
router.get('/queue', asyncHandler(printerController.getQueue.bind(printerController)));

export default router;
