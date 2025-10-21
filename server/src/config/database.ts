import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Cloud SQL connection configuration
const poolConfig: pg.PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'memeter',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Use Unix socket for Cloud SQL in production, TCP for local development
if (process.env.INSTANCE_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
  poolConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
  
  // Enable SSL for Cloud SQL public IP connections
  if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    poolConfig.ssl = {
      rejectUnauthorized: false, // Cloud SQL uses self-signed certs
    };
  }
}

export const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Initialize database schema
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        mint VARCHAR(44) UNIQUE NOT NULL,
        name VARCHAR(255),
        symbol VARCHAR(50),
        uri TEXT,
        image TEXT,
        description TEXT,
        creator VARCHAR(44),
        pool VARCHAR(20),
        market_cap_sol DECIMAL(20, 8),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        website TEXT,
        twitter TEXT,
        telegram TEXT,
        discord TEXT,
        youtube TEXT,
        instagram TEXT,
        reddit TEXT,
        tiktok TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on timestamp for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_timestamp ON tokens(timestamp DESC)
    `);

    // Create index on mint for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_mint ON tokens(mint)
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}
