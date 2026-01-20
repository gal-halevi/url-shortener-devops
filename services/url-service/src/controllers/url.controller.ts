import { Request, Response } from 'express';
import { URLService } from '../services/url.service';

const urlService = new URLService();

/**
 * POST /api/v1/urls - Create short URL
 */
export async function createURL(req: Request, res: Response) {
  try {
    const { longUrl, customAlias, expiresAt } = req.body;
    
    // Basic validation
    if (!longUrl) {
      return res.status(400).json({ error: 'longUrl is required' });
    }
    
    // Get userId from auth middleware (we'll add this later)
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
  } catch (error: any) {
    console.error('Error creating URL:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/v1/urls/:code - Get URL details
 */
export async function getURL(req: Request, res: Response) {
  try {
    const { code } = req.params;

    if (!code || Array.isArray(code)) {
      return res.status(400).json({ error: 'Invalid short code' });
    }
    
    const url = await urlService.getURLByShortCode(code);
    
    res.status(200).json({
      shortCode: url.short_code,
      longUrl: url.long_url,
      createdAt: url.created_at,
      expiresAt: url.expires_at,
      clickCount: url.click_count
    });
  } catch (error: any) {
    console.error('Error getting URL:', error);
    res.status(404).json({ error: error.message });
  }
}

/**
 * DELETE /api/v1/urls/:code - Delete URL
 */
export async function deleteURL(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const userId = (req as any).userId;

    if (!code || Array.isArray(code)) {
      return res.status(400).json({ error: 'Invalid short code' });
    }
    
    const deleted = await urlService.deleteURL(code, userId);
    
    if (deleted) {
      res.status(200).json({ message: 'URL deleted successfully' });
    } else {
      res.status(404).json({ error: 'URL not found or unauthorized' });
    }
  } catch (error: any) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: error.message });
  }
}