import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';

// Create Redis client
const redis = new Redis(config.redis.url);

redis.on('connect', () => {
  console.log('Connected to Redis for rate limiting');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Custom error message
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests, please try again later' } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use userId if authenticated, otherwise use IP address
      const userId = (req as any).userId;
      const identifier = userId || req.ip || 'unknown';
      
      // Create Redis key
      const key = `ratelimit:${identifier}:${req.path}`;
      
      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current, 10) : 0;
      
      // Check if limit exceeded
      if (currentCount >= max) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: Math.ceil(windowMs / 1000) // seconds
        });
      }
      
      // Increment counter
      const newCount = await redis.incr(key);
      
      // Set expiry on first request
      if (newCount === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', (max - newCount).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If Redis fails, allow the request (fail open)
      next();
    }
  };
}

// Pre-configured rate limiters for different endpoints

/**
 * Global rate limiter - applies to all API endpoints
 * 100 requests per 15 minutes per IP/user
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Create URL rate limiter - stricter limit
 * 10 URLs per hour per user
 */
export const createUrlRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'You can only create 10 URLs per hour'
});

/**
 * Delete URL rate limiter
 * 20 deletes per hour per user
 */
export const deleteUrlRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'You can only delete 20 URLs per hour'
});