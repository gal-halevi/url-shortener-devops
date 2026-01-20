import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

/**
 * Middleware to authenticate requests using API key
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide an API key in X-API-Key header'
      });
    }
    
    // Check if API key exists in database
    const query = `
      SELECT id, email, is_active 
      FROM users 
      WHERE api_key_hash = $1
    `;
    
    const result = await pool.query(query, [apiKey]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }
    
    // Attach user info to request
    (req as any).userId = user.id;
    (req as any).userEmail = user.email;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - doesn't fail if no API key provided
 * But validates if one is provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;
  
  // If no API key, just continue without user info
  if (!apiKey) {
    return next();
  }
  
  // If API key provided, validate it
  return authenticateApiKey(req, res, next);
}