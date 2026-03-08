/**
 * PDF Worker Thread
 * Handles PDF generation in a separate thread to avoid blocking the main server thread
 */

import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import { KannadaTicketGenerator } from '../generators/kannadaTicketGenerator';
import { EnglishTicketGenerator } from '../generators/englishTicketGenerator';
import { formatTicketData } from '../common/ticketFormatter';
import type { TicketData, FormattedTicket } from '../common/types';

interface WorkerMessage {
  id: string;
  type: 'generate';
  ticketData: TicketData;
  generatorType: 'kannada' | 'english';
  tempDir: string;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  pdfPath?: string;
  error?: string;
}

if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    try {
      if (message.type === 'generate') {
        const { id, ticketData, generatorType, tempDir } = message;

        // Format ticket data
        const formattedTicket = formatTicketData(
          ticketData,
          generatorType === 'kannada',
          generatorType === 'english' // English returns numbers as strings
        );

        // Create appropriate generator
        let generator: KannadaTicketGenerator | EnglishTicketGenerator;
        if (generatorType === 'kannada') {
          generator = new KannadaTicketGenerator(tempDir);
        } else {
          generator = new EnglishTicketGenerator(tempDir);
        }

        // Generate PDF
        const pdfPath = await generator.generatePDF(formattedTicket);

        // Send success response
        const response: WorkerResponse = {
          id,
          success: true,
          pdfPath
        };

        parentPort?.postMessage(response);
      }
    } catch (error) {
      // Send error response
      const response: WorkerResponse = {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      parentPort?.postMessage(response);
    }
  });
}

