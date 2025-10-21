import express, { Request, Response } from 'express';
import { TicketIdController } from '../controllers/TicketIdController';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const ticketIdController = new TicketIdController();

// Ticket ID management routes
router.get('/current', asyncHandler((req: Request, res: Response) => ticketIdController.getCurrent(req, res)));
router.post('/reset', asyncHandler((req: Request, res: Response) => ticketIdController.reset(req, res)));
router.get('/next', asyncHandler((req: Request, res: Response) => ticketIdController.getNext(req, res)));

export default router;
