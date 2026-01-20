import express from 'express';
import pool from './db';
import { customAlphabet } from 'nanoid';

const app = express();
const PORT = process.env.PORT || 3000;

// Generate short codes: 7 characters, URL-safe alphabet
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'url-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// Create short URL
app.post('/api/urls', async (req, res) => {
  const { long_url, custom_code } = req.body;

  if (!long_url) {
    return res.status(400).json({ error: 'long_url is required' });
  }

  try {
    new URL(long_url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const shortCode = custom_code || nanoid();

  try {
    const result = await pool.query(
      'INSERT INTO urls (short_code, long_url) VALUES ($1, $2) RETURNING id, short_code, long_url, created_at',
      [shortCode, long_url]
    );

    const url = result.rows[0];
    res.status(201).json({
      id: url.id,
      short_code: url.short_code,
      short_url: `${process.env.BASE_URL || 'http://localhost:3000'}/${url.short_code}`,
      long_url: url.long_url,
      created_at: url.created_at,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    console.error('Error creating URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get URL by short code
app.get('/api/urls/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, short_code, long_url, created_at, expires_at FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const url = result.rows[0];
    res.json({
      id: url.id,
      short_code: url.short_code,
      short_url: `${process.env.BASE_URL || 'http://localhost:3000'}/${url.short_code}`,
      long_url: url.long_url,
      created_at: url.created_at,
      expires_at: url.expires_at,
    });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all URLs (for development)
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, short_code, long_url, created_at FROM urls ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing URLs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`URL service running on port ${PORT}`);
});
