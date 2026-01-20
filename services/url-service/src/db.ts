import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'urlshortener',
  password: process.env.POSTGRES_PASSWORD || 'url_dev_pass_2024',
  database: process.env.POSTGRES_DB || 'urlshortener',
});

export default pool;
