import { productionLogger } from './productionLogger';

/**
 * Performance Monitoring System
 * Tracks system performance metrics and resource usage
 */

export interface PerformanceMetrics {
  timestamp: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
  };
  requests: {
    total: number;
    averageResponseTime: number;
    errorRate: number;
  };
  uptime: number;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowestRequest: number;
  fastestRequest: number;
}

class PerformanceMonitor {
  private startTime: number;
  private requestMetrics: RequestMetrics;
  private databaseMetrics: {
    queryCount: number;
    totalQueryTime: number;
    connectionCount: number;
  };

  constructor() {
    this.startTime = Date.now();
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Infinity
    };
    this.databaseMetrics = {
      queryCount: 0,
      totalQueryTime: 0,
      connectionCount: 0
    };
  }

  public getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  }

  public getCpuUsage(): { usage: number } {
    // Simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const cpuUsage = process.cpuUsage();
    const usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    return { usage };
  }

  public recordRequest(responseTime: number, success: boolean): void {
    this.requestMetrics.totalRequests++;
    
    if (success) {
      this.requestMetrics.successfulRequests++;
    } else {
      this.requestMetrics.failedRequests++;
    }

    // Update response time metrics
    const totalTime = this.requestMetrics.averageResponseTime * (this.requestMetrics.totalRequests - 1) + responseTime;
    this.requestMetrics.averageResponseTime = totalTime / this.requestMetrics.totalRequests;

    if (responseTime > this.requestMetrics.slowestRequest) {
      this.requestMetrics.slowestRequest = responseTime;
    }

    if (responseTime < this.requestMetrics.fastestRequest) {
      this.requestMetrics.fastestRequest = responseTime;
    }
  }

  public recordDatabaseQuery(duration: number): void {
    this.databaseMetrics.queryCount++;
    this.databaseMetrics.totalQueryTime += duration;
  }

  public setDatabaseConnectionCount(count: number): void {
    this.databaseMetrics.connectionCount = count;
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const uptime = Date.now() - this.startTime;

    return {
      timestamp: new Date().toISOString(),
      memory,
      cpu,
      database: {
        connectionCount: this.databaseMetrics.connectionCount,
        queryCount: this.databaseMetrics.queryCount,
        averageQueryTime: this.databaseMetrics.queryCount > 0 
          ? this.databaseMetrics.totalQueryTime / this.databaseMetrics.queryCount 
          : 0
      },
      requests: {
        total: this.requestMetrics.totalRequests,
        averageResponseTime: this.requestMetrics.averageResponseTime,
        errorRate: this.requestMetrics.totalRequests > 0 
          ? (this.requestMetrics.failedRequests / this.requestMetrics.totalRequests) * 100 
          : 0
      },
      uptime
    };
  }

  public getRequestMetrics(): RequestMetrics {
    return { ...this.requestMetrics };
  }

  public logPerformanceMetrics(): void {
    const metrics = this.getPerformanceMetrics();
    
    productionLogger.info('Performance metrics collected', 'PERFORMANCE', {
      memory: metrics.memory,
      cpu: metrics.cpu,
      database: metrics.database,
      requests: metrics.requests,
      uptime: metrics.uptime
    });

    // Log warnings for concerning metrics
    if (metrics.memory.percentage > 80) {
      productionLogger.warn('High memory usage detected', 'PERFORMANCE', {
        memoryPercentage: metrics.memory.percentage,
        memoryUsed: metrics.memory.used,
        memoryTotal: metrics.memory.total
      });
    }

    if (metrics.requests.errorRate > 5) {
      productionLogger.warn('High error rate detected', 'PERFORMANCE', {
        errorRate: metrics.requests.errorRate,
        totalRequests: metrics.requests.total,
        failedRequests: this.requestMetrics.failedRequests
      });
    }

    if (metrics.database.averageQueryTime > 1000) {
      productionLogger.warn('Slow database queries detected', 'PERFORMANCE', {
        averageQueryTime: metrics.database.averageQueryTime,
        queryCount: metrics.database.queryCount
      });
    }
  }

  public resetMetrics(): void {
    this.startTime = Date.now();
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Infinity
    };
    this.databaseMetrics = {
      queryCount: 0,
      totalQueryTime: 0,
      connectionCount: 0
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
