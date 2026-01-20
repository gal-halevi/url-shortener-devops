const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encode a number to Base62 string
 */
export function encodeBase62(num: number): string {
  if (num === 0) return BASE62_CHARS[0];
  
  let encoded = '';
  while (num > 0) {
    encoded = BASE62_CHARS[num % 62] + encoded;
    num = Math.floor(num / 62);
  }
  return encoded;
}

/**
 * Decode a Base62 string to number
 */
export function decodeBase62(str: string): number {
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    decoded = decoded * 62 + BASE62_CHARS.indexOf(str[i]);
  }
  return decoded;
}

/**
 * Generate a random short code (7 characters by default)
 */
export function generateShortCode(length: number = 7): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * 62);
    code += BASE62_CHARS[randomIndex];
  }
  return code;
}