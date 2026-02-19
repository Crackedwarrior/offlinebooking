import express from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { SettingsService } from '../services/settingsService';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services and controllers
const settingsService = new SettingsService(prisma);
const settingsController = new SettingsController(settingsService);

// Settings routes
router.get('/', asyncHandler(settingsController.get.bind(settingsController)));
router.post('/', asyncHandler(settingsController.update.bind(settingsController)));

export default router;
