import { encodeBase62, decodeBase62, generateShortCode } from '../../../src/utils/base62';

describe('Base62 Encoding', () => {
  describe('encodeBase62', () => {
    test('should encode 0 correctly', () => {
      expect(encodeBase62(0)).toBe('0');
    });

    test('should encode positive numbers correctly', () => {
      expect(encodeBase62(1)).toBe('1');
      expect(encodeBase62(10)).toBe('a');
      expect(encodeBase62(61)).toBe('Z');
      expect(encodeBase62(62)).toBe('10');
      expect(encodeBase62(123)).toBe('1Z');
    });

    test('should encode large numbers', () => {
      const largeNum = 123456789;
      const encoded = encodeBase62(largeNum);
      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('decodeBase62', () => {
    test('should decode correctly', () => {
      expect(decodeBase62('0')).toBe(0);
      expect(decodeBase62('1')).toBe(1);
      expect(decodeBase62('a')).toBe(10);
      expect(decodeBase62('Z')).toBe(61);
    });

    test('should be inverse of encode', () => {
      const testNumbers = [0, 1, 10, 62, 123, 456, 789, 12345, 67890];
      
      testNumbers.forEach(num => {
        const encoded = encodeBase62(num);
        const decoded = decodeBase62(encoded);
        expect(decoded).toBe(num);
      });
    });
  });

  describe('generateShortCode', () => {
    test('should generate code of default length (7)', () => {
      const code = generateShortCode();
      expect(code).toHaveLength(7);
    });

    test('should generate code of specified length', () => {
      expect(generateShortCode(5)).toHaveLength(5);
      expect(generateShortCode(10)).toHaveLength(10);
    });

    test('should generate unique codes', () => {
      const codes = new Set<string>();
      
      // Generate 1000 codes
      for (let i = 0; i < 1000; i++) {
        codes.add(generateShortCode());
      }
      
      // All should be unique
      expect(codes.size).toBe(1000);
    });

    test('should only contain valid Base62 characters', () => {
      const validChars = /^[0-9a-zA-Z]+$/;
      
      for (let i = 0; i < 100; i++) {
        const code = generateShortCode();
        expect(code).toMatch(validChars);
      }
    });
  });
});