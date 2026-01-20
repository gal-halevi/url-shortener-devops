import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || '',
  },
  apiKey: process.env.API_KEY || '',
};

// Validate required config
if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

if (!config.redis.url) {
  throw new Error('REDIS_URL is required');
}