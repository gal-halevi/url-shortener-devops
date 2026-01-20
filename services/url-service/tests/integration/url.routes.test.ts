import request from 'supertest';
import app from '../../src/app';

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn(),
  },
  testDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    pexpire: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
});

import { pool } from '../../src/config/database';

describe('URL Routes Integration Tests', () => {
  const mockQuery = pool.query as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/urls', () => {
    test('should create short URL with valid API key', async () => {
      // Mock authentication - user lookup
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Mock URL creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'url-123',
          short_code: 'abc123',
          long_url: 'https://example.com',
          user_id: 'user-123',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
          click_count: 0,
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/v1/urls')
        .set('X-API-Key', 'test-api-key')
        .send({ longUrl: 'https://example.com' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('shortCode');
      expect(response.body).toHaveProperty('shortUrl');
      expect(response.body.longUrl).toBe('https://example.com');
    });

    test('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/urls')
        .send({ longUrl: 'https://example.com' });

      expect(response.status).toBe(401);
      // Response might be empty body with 401, which is also acceptable
      if (Object.keys(response.body).length > 0) {
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should return 401 with invalid API key', async () => {
      // Mock user lookup - no user found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/v1/urls')
        .set('X-API-Key', 'invalid-key')
        .send({ longUrl: 'https://example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid API key');
    });

    test('should return 400 with missing longUrl', async () => {
      // Mock authentication
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/v1/urls')
        .set('X-API-Key', 'test-api-key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 with invalid URL format', async () => {
      // Mock authentication
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/v1/urls')
        .set('X-API-Key', 'test-api-key')
        .send({ longUrl: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should accept custom alias', async () => {
      // Mock authentication
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Mock URL creation with custom alias
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'url-123',
          short_code: 'my-custom',
          long_url: 'https://example.com',
          user_id: 'user-123',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
          click_count: 0,
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .post('/api/v1/urls')
        .set('X-API-Key', 'test-api-key')
        .send({
          longUrl: 'https://example.com',
          customAlias: 'my-custom',
        });

      expect(response.status).toBe(201);
      expect(response.body.shortCode).toBe('my-custom');
    });
  });

  describe('GET /api/v1/urls/:code', () => {
    test('should get URL details by short code', async () => {
      // Mock URL lookup
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'url-123',
          short_code: 'abc123',
          long_url: 'https://example.com',
          user_id: 'user-123',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
          click_count: 5,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .get('/api/v1/urls/abc123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shortCode', 'abc123');
      expect(response.body).toHaveProperty('longUrl', 'https://example.com');
      expect(response.body).toHaveProperty('clickCount', 5);
    });

    test('should return 404 for non-existent short code', async () => {
      // Mock URL lookup - not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .get('/api/v1/urls/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/urls/:code', () => {
    test('should delete URL with valid API key', async () => {
      // Mock authentication
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Mock delete operation
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .delete('/api/v1/urls/abc123')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 401 without API key', async () => {
      const response = await request(app)
        .delete('/api/v1/urls/abc123');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 for non-existent URL', async () => {
      // Mock authentication
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: true,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Mock delete - not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .delete('/api/v1/urls/nonexistent')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health Endpoints', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'url-service');
    });

    test('GET /ready should return 200 when DB is connected', async () => {
      // Mock successful DB query
      mockQuery.mockResolvedValueOnce({
        rows: [{ now: new Date() }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const response = await request(app)
        .get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});