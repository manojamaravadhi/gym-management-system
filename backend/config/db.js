const { Pool } = require('pg');
require('dotenv').config();

const isLocal =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes('@localhost') ||
   process.env.DATABASE_URL.includes('@127.0.0.1') ||
   process.env.DATABASE_URL.includes('@db:'));

const isHostedDb = !isLocal && (
  (process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('sslmode=require') ||
    process.env.DATABASE_URL.includes('neon.tech') ||
    process.env.DATABASE_URL.includes('supabase.co') ||
    process.env.DATABASE_URL.includes('supabase.com') ||
    process.env.DATABASE_URL.includes('render.com')
  )) || (process.env.NODE_ENV === 'production' && !isLocal)
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isHostedDb ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    // Single confirmation, not per-query noise
  }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Run a parameterized query. NEVER interpolate user input into `text`.
 * @param {string} text  SQL with $1, $2 placeholders
 * @param {Array}  params
 */
const query = (text, params) => pool.query(text, params);

/** Acquire a client for transactions (BEGIN/COMMIT/ROLLBACK). */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
