interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  requests: number[];
  blocked: boolean;
  blockUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Set default rate limits
    this.setLimit('api', { maxRequests: 100, windowMs: 15 * 60 * 1000 }); // 100 requests per 15 minutes
    this.setLimit('booking', { maxRequests: 20, windowMs: 15 * 60 * 1000 }); // 20 booking requests per 15 minutes
    this.setLimit('print', { maxRequests: 10, windowMs: 15 * 60 * 1000 }); // 10 print requests per 15 minutes
  }

  setLimit(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
  }

  isAllowed(key: string): boolean {
    const config = this.configs.get(key);
    if (!config) return true; // No limit set

    const now = Date.now();
    const state = this.limits.get(key) || { requests: [], blocked: false };

    // Check if currently blocked
    if (state.blocked && state.blockUntil && now < state.blockUntil) {
      return false;
    }

    // Clear expired requests
    state.requests = state.requests.filter(time => now - time < config.windowMs);

    // Check if limit exceeded
    if (state.requests.length >= config.maxRequests) {
      // Block for the remaining window time
      const oldestRequest = Math.min(...state.requests);
      const blockUntil = oldestRequest + config.windowMs;
      
      state.blocked = true;
      state.blockUntil = blockUntil;
      this.limits.set(key, state);
      
      console.warn(`Rate limit exceeded for ${key}. Blocked until ${new Date(blockUntil).toLocaleTimeString()}`);
      return false;
    }

    // Add current request
    state.requests.push(now);
    state.blocked = false;
    state.blockUntil = undefined;
    this.limits.set(key, state);

    return true;
  }

  getRemainingRequests(key: string): number {
    const config = this.configs.get(key);
    if (!config) return Infinity;

    const now = Date.now();
    const state = this.limits.get(key) || { requests: [], blocked: false };

    // Clear expired requests
    state.requests = state.requests.filter(time => now - time < config.windowMs);

    return Math.max(0, config.maxRequests - state.requests.length);
  }

  getTimeUntilReset(key: string): number {
    const config = this.configs.get(key);
    if (!config) return 0;

    const now = Date.now();
    const state = this.limits.get(key) || { requests: [], blocked: false };

    if (state.requests.length === 0) return 0;

    // Find the oldest request
    const oldestRequest = Math.min(...state.requests);
    return Math.max(0, oldestRequest + config.windowMs - now);
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  resetAll(): void {
    this.limits.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to check rate limit before making API calls
export const checkRateLimit = (key: string): boolean => {
  const allowed = rateLimiter.isAllowed(key);
  
  if (!allowed) {
    const remainingTime = rateLimiter.getTimeUntilReset(key);
    console.warn(`Rate limit exceeded for ${key}. Try again in ${Math.ceil(remainingTime / 1000)} seconds`);
  }
  
  return allowed;
};

// Helper function to get rate limit info
export const getRateLimitInfo = (key: string) => {
  return {
    remaining: rateLimiter.getRemainingRequests(key),
    timeUntilReset: rateLimiter.getTimeUntilReset(key),
    isAllowed: rateLimiter.isAllowed(key)
  };
};
