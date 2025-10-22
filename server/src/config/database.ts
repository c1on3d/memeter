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
if (process.env.NODE_ENV === 'production') {
  // Cloud Run uses Unix socket
  poolConfig.host = `/cloudsql/memeter:us-central1:memeter-db`;
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
        market_cap_usd DECIMAL(20, 2),
        price_usd DECIMAL(20, 10),
        volume_24h DECIMAL(20, 2),
        price_change_24h DECIMAL(10, 2),
        liquidity_usd DECIMAL(20, 2),
        pair_address TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        website TEXT,
        twitter TEXT,
        telegram TEXT,
        discord TEXT,
        youtube TEXT,
        instagram TEXT,
        reddit TEXT,
        tiktok TEXT,
        raydium_pool TEXT,
        migrated_at TIMESTAMP,
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

    // Add migration columns if they don't exist
    await client.query(`
      ALTER TABLE tokens 
      ADD COLUMN IF NOT EXISTS raydium_pool TEXT,
      ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP
    `);

    // Add DexScreener market data columns if they don't exist
    await client.query(`
      ALTER TABLE tokens 
      ADD COLUMN IF NOT EXISTS market_cap_usd DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS price_usd DECIMAL(20, 10),
      ADD COLUMN IF NOT EXISTS volume_24h DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS price_change_24h DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS liquidity_usd DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS pair_address TEXT
    `);

    // Create index on migrated_at for faster migration queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_migrated_at ON tokens(migrated_at DESC) WHERE migrated_at IS NOT NULL
    `);

    // Trades table for tracking buy/sell transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        mint VARCHAR(44) NOT NULL,
        tx_type VARCHAR(10) NOT NULL,
        signature VARCHAR(88) UNIQUE NOT NULL,
        trader VARCHAR(44),
        sol_amount DECIMAL(20, 8),
        token_amount DECIMAL(30, 8),
        price_sol DECIMAL(20, 10),
        market_cap_sol DECIMAL(20, 8),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for trades table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_mint ON trades(mint)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader)
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
