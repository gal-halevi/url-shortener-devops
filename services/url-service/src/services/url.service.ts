import { URLRepository } from '../repositories/url.repository';
import { CreateURLRequest, CreateURLResponse } from '../types/url.types';
import { 
  createValidationError, 
  createNotFoundError 
} from '../middleware/error.middleware';

export class URLService {
  private urlRepository: URLRepository;

  constructor() {
    this.urlRepository = new URLRepository();
  }

  /**
   * Create a short URL
   */
  async createShortURL(data: CreateURLRequest, userId?: string): Promise<CreateURLResponse> {
    // Validate URL format
    this.validateURL(data.longUrl);
    
    // If custom alias provided, validate it
    if (data.customAlias) {
      this.validateCustomAlias(data.customAlias);
    }
    
    // Create URL in database
    const url = await this.urlRepository.create(data, userId);
    
    // Return formatted response
    return {
      id: url.id,
      shortCode: url.short_code,
      shortUrl: `${this.getBaseUrl()}/${url.short_code}`,
      longUrl: url.long_url,
      createdAt: url.created_at,
      expiresAt: url.expires_at
    };
  }

  /**
   * Get URL by short code
   */
  async getURLByShortCode(shortCode: string) {
    const url = await this.urlRepository.findByShortCode(shortCode);
    
    if (!url) {
      throw createNotFoundError('URL not found');
    }
    
    // Check if expired
    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      throw createNotFoundError('URL has expired');
    }
    
    return url;
  }

  /**
   * Delete URL
   */
  async deleteURL(shortCode: string, userId?: string): Promise<boolean> {
    return await this.urlRepository.delete(shortCode, userId);
  }

  /**
   * Validate URL format
   */
  private validateURL(url: string): void {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw createValidationError('Only HTTP and HTTPS URLs are allowed');
      }
      
      // Block localhost and internal IPs (security)
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (blockedHosts.includes(parsed.hostname)) {
        throw createValidationError('Cannot shorten localhost URLs');
      }
      
    } catch (error) {
      if (error instanceof TypeError) {
        throw createValidationError('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Validate custom alias
   */
  private validateCustomAlias(alias: string): void {
    // Only alphanumeric, dash, and underscore
    const validPattern = /^[a-zA-Z0-9_-]{3,20}$/;
    
    if (!validPattern.test(alias)) {
      throw createValidationError(
        'Custom alias must be 3-20 characters (letters, numbers, dash, underscore only)'
      );
    }
    
    // Reserved words
    const reserved = ['api', 'health', 'ready', 'admin', 'dashboard'];
    if (reserved.includes(alias.toLowerCase())) {
      throw createValidationError('This alias is reserved');
    }
  }

  /**
   * Get base URL for short links
   */
  private getBaseUrl(): string {
    // In production, this would be your domain
    return process.env.BASE_URL || 'http://localhost:3002';
  }
}