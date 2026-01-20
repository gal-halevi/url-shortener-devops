export interface URL {
  id: string;
  short_code: string;
  long_url: string;
  user_id: string | null;
  created_at: Date;
  expires_at: Date | null;
  is_active: boolean;
  click_count: number;
}

export interface CreateURLRequest {
  longUrl: string;
  customAlias?: string;
  expiresAt?: Date;
}

export interface CreateURLResponse {
  id: string;
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
}