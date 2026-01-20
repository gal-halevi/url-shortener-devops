import { Request, Response, NextFunction } from 'express';
import { URLService } from '../services/url.service';
import { asyncHandler, createValidationError } from '../middleware/error.middleware';

const urlService = new URLService();

/**
 * POST /api/v1/urls - Create short URL
 */
export const createURL = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { longUrl, customAlias, expiresAt } = req.body;
  
  // Basic validation
  if (!longUrl) {
    throw createValidationError('longUrl is required');
  }
  
  // Get userId from auth middleware
  const userId = (req as any).userId;
  
  const result = await urlService.createShortURL(
    {
      longUrl,
      customAlias,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    },
    userId
  );
  
  res.status(201).json(result);
});

/**
 * GET /api/v1/urls/:code - Get URL details
 */
export const getURL = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  
  // Validate code is a string
  if (!code || Array.isArray(code)) {
    throw createValidationError('Invalid short code');
  }
  
  const url = await urlService.getURLByShortCode(code);
  
  res.status(200).json({
    shortCode: url.short_code,
    longUrl: url.long_url,
    createdAt: url.created_at,
    expiresAt: url.expires_at,
    clickCount: url.click_count
  });
});

/**
 * DELETE /api/v1/urls/:code - Delete URL
 */
export const deleteURL = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  const userId = (req as any).userId;
  
  // Validate code is a string
  if (!code || Array.isArray(code)) {
    throw createValidationError('Invalid short code');
  }
  
  const deleted = await urlService.deleteURL(code, userId);
  
  if (deleted) {
    res.status(200).json({ message: 'URL deleted successfully' });
  } else {
    res.status(404).json({ error: 'URL not found or unauthorized' });
  }
});