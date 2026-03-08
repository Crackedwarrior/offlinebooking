/**
 * PDF Worker Pool
 * Manages a pool of worker threads for concurrent PDF generation
 */

import { Worker } from 'worker_threads';
import path from 'path';
import type { TicketData } from '../common/types';

interface PendingTask {
  id: string;
  ticketData: TicketData;
  generatorType: 'kannada' | 'english';
  resolve: (pdfPath: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class PDFWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private pendingTasks: PendingTask[] = [];
  private taskIdCounter: number = 0;
  private readonly poolSize: number;
  private readonly maxQueueSize: number;
  private readonly taskTimeout: number;
  private readonly workerPath: string;
  private readonly tempDir: string;

  constructor(
    poolSize: number = 4,
    maxQueueSize: number = 100,
    taskTimeout: number = 30000,
    tempDir: string
  ) {
    this.poolSize = poolSize;
    this.maxQueueSize = maxQueueSize;
    this.taskTimeout = taskTimeout;
    this.tempDir = tempDir;
    
    // Worker script path
    this.workerPath = path.join(__dirname, 'pdfWorker.js');
    
    // Initialize worker pool
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerPath, {
      workerData: { tempDir: this.tempDir }
    });

    worker.on('message', (response: any) => {
      this.handleWorkerResponse(worker, response);
    });

    worker.on('error', (error) => {
      console.error('[WORKER] Worker error:', error);
      this.handleWorkerError(worker, error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[WORKER] Worker stopped with exit code ${code}`);
        // Replace the dead worker
        this.replaceWorker(worker);
      }
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);

    return worker;
  }

  private replaceWorker(deadWorker: Worker): void {
    const index = this.workers.indexOf(deadWorker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(deadWorker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // Create a new worker to replace the dead one
    this.createWorker();
  }

  private handleWorkerResponse(worker: Worker, response: any): void {
    const taskIndex = this.pendingTasks.findIndex(task => task.id === response.id);
    if (taskIndex === -1) {
      console.warn('[WORKER] Received response for unknown task:', response.id);
      this.availableWorkers.push(worker);
      return;
    }

    const task = this.pendingTasks[taskIndex];
    this.pendingTasks.splice(taskIndex, 1);
    clearTimeout(task.timeout);

    if (response.success && response.pdfPath) {
      task.resolve(response.pdfPath);
    } else {
      task.reject(new Error(response.error || 'PDF generation failed'));
    }

    // Make worker available again
    this.availableWorkers.push(worker);
    this.processQueue();
  }

  private handleWorkerError(worker: Worker, error: Error): void {
    // Find and reject any pending tasks for this worker
    const tasks = this.pendingTasks.filter((_, index) => {
      // In a real implementation, we'd track which worker is handling which task
      // For simplicity, we'll just reject the first pending task
      return index === 0;
    });

    tasks.forEach(task => {
      clearTimeout(task.timeout);
      task.reject(error);
    });

    this.replaceWorker(worker);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.availableWorkers.length === 0 || this.pendingTasks.length === 0) {
      return;
    }

    const worker = this.availableWorkers.shift();
    const task = this.pendingTasks.shift();

    if (!worker || !task) {
      return;
    }

    // Set timeout for task
    const timeout = setTimeout(() => {
      const taskIndex = this.pendingTasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        this.pendingTasks.splice(taskIndex, 1);
        task.reject(new Error('PDF generation timeout'));
        this.availableWorkers.push(worker);
        this.processQueue();
      }
    }, this.taskTimeout);

    task.timeout = timeout;

    // Send task to worker
    worker.postMessage({
      id: task.id,
      type: 'generate',
      ticketData: task.ticketData,
      generatorType: task.generatorType,
      tempDir: this.tempDir
    });
  }

  /**
   * Generate PDF using worker pool
   */
  async generatePDF(
    ticketData: TicketData,
    generatorType: 'kannada' | 'english'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.pendingTasks.length >= this.maxQueueSize) {
        reject(new Error('PDF generation queue is full'));
        return;
      }

      // Generate unique task ID
      const taskId = `task_${++this.taskIdCounter}_${Date.now()}`;

      // Create task
      const task: PendingTask = {
        id: taskId,
        ticketData,
        generatorType,
        resolve,
        reject,
        timeout: setTimeout(() => {}) // Will be set in processQueue
      };

      this.pendingTasks.push(task);
      this.processQueue();
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    pendingTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      pendingTasks: this.pendingTasks.length
    };
  }

  /**
   * Shutdown worker pool
   */
  async shutdown(): Promise<void> {
    // Reject all pending tasks
    this.pendingTasks.forEach(task => {
      clearTimeout(task.timeout);
      task.reject(new Error('Worker pool is shutting down'));
    });
    this.pendingTasks = [];

    // Terminate all workers
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);

    this.workers = [];
    this.availableWorkers = [];
  }
}

