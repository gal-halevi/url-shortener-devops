import { URLService } from '../../../src/services/url.service';
import { URLRepository } from '../../../src/repositories/url.repository';

// Mock the repository
jest.mock('../../../src/repositories/url.repository');

describe('URLService', () => {
  let urlService: URLService;
  let mockRepository: jest.Mocked<URLRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    urlService = new URLService();
    mockRepository = (urlService as any).urlRepository;
  });

  describe('validateURL', () => {
    test('should accept valid HTTPS URLs', async () => {
      mockRepository.create.mockResolvedValue({
        id: '123',
        short_code: 'abc123',
        long_url: 'https://example.com',
        user_id: null,
        created_at: new Date(),
        expires_at: null,
        is_active: true,
        click_count: 0,
      });

      const result = await urlService.createShortURL({
        longUrl: 'https://example.com',
      });

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    test('should accept valid HTTP URLs', async () => {
      mockRepository.create.mockResolvedValue({
        id: '123',
        short_code: 'abc123',
        long_url: 'http://example.com',
        user_id: null,
        created_at: new Date(),
        expires_at: null,
        is_active: true,
        click_count: 0,
      });

      const result = await urlService.createShortURL({
        longUrl: 'http://example.com',
      });

      expect(result).toBeDefined();
    });

    test('should reject invalid URL format', async () => {
      await expect(
        urlService.createShortURL({ longUrl: 'not-a-url' })
      ).rejects.toThrow('Invalid URL format');
    });

    test('should reject localhost URLs', async () => {
      await expect(
        urlService.createShortURL({ longUrl: 'http://localhost:3000' })
      ).rejects.toThrow('Cannot shorten localhost URLs');
    });

    test('should reject 127.0.0.1 URLs', async () => {
      await expect(
        urlService.createShortURL({ longUrl: 'http://127.0.0.1:8080' })
      ).rejects.toThrow('Cannot shorten localhost URLs');
    });

    test('should reject non-HTTP protocols', async () => {
      await expect(
        urlService.createShortURL({ longUrl: 'ftp://example.com' })
      ).rejects.toThrow('Only HTTP and HTTPS URLs are allowed');
    });
  });

  describe('validateCustomAlias', () => {
    test('should accept valid custom aliases', async () => {
      mockRepository.create.mockResolvedValue({
        id: '123',
        short_code: 'my-custom-alias',
        long_url: 'https://example.com',
        user_id: null,
        created_at: new Date(),
        expires_at: null,
        is_active: true,
        click_count: 0,
      });

      const result = await urlService.createShortURL({
        longUrl: 'https://example.com',
        customAlias: 'my-custom-alias',
      });

      expect(result.shortCode).toBe('my-custom-alias');
    });

    test('should reject aliases that are too short', async () => {
      await expect(
        urlService.createShortURL({
          longUrl: 'https://example.com',
          customAlias: 'ab',
        })
      ).rejects.toThrow('Custom alias must be 3-20 characters');
    });

    test('should reject aliases that are too long', async () => {
      await expect(
        urlService.createShortURL({
          longUrl: 'https://example.com',
          customAlias: 'a'.repeat(21),
        })
      ).rejects.toThrow('Custom alias must be 3-20 characters');
    });

    test('should reject aliases with invalid characters', async () => {
      await expect(
        urlService.createShortURL({
          longUrl: 'https://example.com',
          customAlias: 'my alias!',
        })
      ).rejects.toThrow('Custom alias must be 3-20 characters');
    });

    test('should reject reserved aliases', async () => {
      const reserved = ['api', 'health', 'admin'];
      
      for (const alias of reserved) {
        await expect(
          urlService.createShortURL({
            longUrl: 'https://example.com',
            customAlias: alias,
          })
        ).rejects.toThrow('This alias is reserved');
      }
    });
  });

  describe('getURLByShortCode', () => {
    test('should return URL if found and active', async () => {
      const mockUrl = {
        id: '123',
        short_code: 'abc123',
        long_url: 'https://example.com',
        user_id: null,
        created_at: new Date(),
        expires_at: null,
        is_active: true,
        click_count: 5,
      };

      mockRepository.findByShortCode.mockResolvedValue(mockUrl);

      const result = await urlService.getURLByShortCode('abc123');

      expect(result).toEqual(mockUrl);
      expect(mockRepository.findByShortCode).toHaveBeenCalledWith('abc123');
    });

    test('should throw error if URL not found', async () => {
      mockRepository.findByShortCode.mockResolvedValue(null);

      await expect(
        urlService.getURLByShortCode('nonexistent')
      ).rejects.toThrow('URL not found');
    });

    test('should throw error if URL expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockRepository.findByShortCode.mockResolvedValue({
        id: '123',
        short_code: 'abc123',
        long_url: 'https://example.com',
        user_id: null,
        created_at: new Date(),
        expires_at: yesterday,
        is_active: true,
        click_count: 0,
      });

      await expect(
        urlService.getURLByShortCode('abc123')
      ).rejects.toThrow('URL has expired');
    });
  });
});