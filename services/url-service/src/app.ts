import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testDatabaseConnection } from './config/database';

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'url-service',
    timestamp: new Date().toISOString()
  });
});

// Readiness check endpoint (checks dependencies)
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;