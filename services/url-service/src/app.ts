import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testDatabaseConnection } from './config/database';
import { createURL, getURL, deleteURL } from './controllers/url.controller';
import { authenticateApiKey, optionalAuth } from './middleware/auth.middleware';
import { 
  globalRateLimiter, 
  createUrlRateLimiter, 
  deleteUrlRateLimiter 
} from './middleware/ratelimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint (no rate limiting)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'url-service',
    timestamp: new Date().toISOString()
  });
});

// Readiness check endpoint (no rate limiting)
app.get('/ready', async (req: Request, res: Response) => {
  const dbHealthy = await testDatabaseConnection();
  
  if (dbHealthy) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// URL routes with SPECIFIC rate limiters (no global limiter here)
app.post('/api/v1/urls', authenticateApiKey, createUrlRateLimiter, createURL);
app.get('/api/v1/urls/:code', globalRateLimiter, getURL);
app.delete('/api/v1/urls/:code', authenticateApiKey, deleteUrlRateLimiter, deleteURL);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

export default app;