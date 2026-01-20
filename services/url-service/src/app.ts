import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testDatabaseConnection } from './config/database';
import { createURL, getURL, deleteURL } from './controllers/url.controller';
// ADD THIS IMPORT:
import { authenticateApiKey, optionalAuth } from './middleware/auth.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'url-service',
    timestamp: new Date().toISOString()
  });
});

// Readiness check endpoint
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

// URL routes - NOW WITH AUTH:
app.post('/api/v1/urls', authenticateApiKey, createURL);      // Requires auth
app.get('/api/v1/urls/:code', getURL);                        // Public (no auth needed)
app.delete('/api/v1/urls/:code', authenticateApiKey, deleteURL); // Requires auth

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;