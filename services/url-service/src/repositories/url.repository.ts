import { pool } from '../config/database';
import { URL, CreateURLRequest } from '../types/url.types';
import { generateShortCode } from '../utils/base62';

export class URLRepository {
  /**
   * Create a new short URL
   */
  async create(data: CreateURLRequest, userId?: string): Promise<URL> {
    const shortCode = data.customAlias || generateShortCode();
    
    const query = `
      INSERT INTO urls (short_code, long_url, user_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      shortCode,
      data.longUrl,
      userId || null,
      data.expiresAt || null
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      // Handle duplicate short code
      if (error.code === '23505') { // Unique violation
        throw new Error('Short code already exists. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Find URL by short code
   */
  async findByShortCode(shortCode: string): Promise<URL | null> {
    const query = `
      SELECT * FROM urls 
      WHERE short_code = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [shortCode]);
    return result.rows[0] || null;
  }

  /**
   * Find URL by ID
   */
  async findById(id: string): Promise<URL | null> {
    const query = `
      SELECT * FROM urls 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Delete URL (soft delete)
   */
  async delete(shortCode: string, userId?: string): Promise<boolean> {
    let query = `
      UPDATE urls 
      SET is_active = false 
      WHERE short_code = $1
    `;
    
    const values: any[] = [shortCode];
    
    // If userId provided, ensure user owns the URL
    if (userId) {
      query += ` AND user_id = $2`;
      values.push(userId);
    }
    
    const result = await pool.query(query, values);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get all URLs for a user
   */
  async findByUserId(userId: string): Promise<URL[]> {
    const query = `
      SELECT * FROM urls 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Increment click count
   */
  async incrementClickCount(shortCode: string): Promise<void> {
    const query = `
      UPDATE urls 
      SET click_count = click_count + 1 
      WHERE short_code = $1
    `;
    
    await pool.query(query, [shortCode]);
  }
}