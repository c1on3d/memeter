import pg from 'pg';

const { Pool } = pg;

export interface Token {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  image?: string;
  description?: string;
  creator?: string;
  marketCapSol?: number;
  timestamp: Date;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

interface QueryCache {
  data: any;
  timestamp: number;
}

class DatabaseService {
  private pool: pg.Pool | null = null;
  private cache: Map<string, QueryCache> = new Map();
  private cacheTTL = 30000; // 30 seconds
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second

  async connect(): Promise<void> {
    const config: pg.PoolConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // Use Unix socket for Cloud Run/App Engine
    if (process.env.DB_SOCKET_PATH) {
      config.host = process.env.DB_SOCKET_PATH;
      delete config.port;
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        this.pool = new Pool(config);
        
        // Test connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log('✅ Connected to PostgreSQL database');
        return;
      } catch (error) {
        attempt++;
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.error(`❌ Database connection failed (attempt ${attempt}/${this.maxRetries}):`, error);
        
        if (attempt < this.maxRetries) {
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ Max retries reached. Exiting...');
          throw new Error('Failed to connect to database after maximum retries');
        }
      }
    }
  }

  private getCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async query(sql: string, params: any[] = []): Promise<pg.QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.query(sql, params);
  }

  async getRecentTokens(limit: number = 50): Promise<Token[]> {
    const cacheKey = this.getCacheKey('getRecentTokens', [limit]);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT 
        mint, name, symbol, uri, image, description, creator,
        market_cap_sol as "marketCapSol", timestamp, website, twitter, telegram, discord
      FROM tokens
      ORDER BY timestamp DESC
      LIMIT $1
    `;
    
    const result = await this.query(sql, [limit]);
    const tokens = result.rows as Token[];
    this.setCache(cacheKey, tokens);
    return tokens;
  }

  async searchTokens(searchQuery: string, limit: number = 20): Promise<Token[]> {
    const cacheKey = this.getCacheKey('searchTokens', [searchQuery, limit]);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT 
        mint, name, symbol, uri, image, description, creator,
        market_cap_sol as "marketCapSol", timestamp, website, twitter, telegram, discord
      FROM tokens
      WHERE 
        LOWER(mint) LIKE LOWER($1) OR
        LOWER(symbol) LIKE LOWER($1) OR
        LOWER(name) LIKE LOWER($1)
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    const searchPattern = `%${searchQuery}%`;
    const result = await this.query(sql, [searchPattern, limit]);
    const tokens = result.rows as Token[];
    this.setCache(cacheKey, tokens);
    return tokens;
  }

  async getTokenByMint(mint: string): Promise<Token | null> {
    const cacheKey = this.getCacheKey('getTokenByMint', [mint]);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT 
        mint, name, symbol, uri, image, description, creator,
        market_cap_sol as "marketCapSol", timestamp, website, twitter, telegram, discord
      FROM tokens
      WHERE mint = $1
    `;
    
    const result = await this.query(sql, [mint]);
    const token = result.rows.length > 0 ? (result.rows[0] as Token) : null;
    this.setCache(cacheKey, token);
    return token;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database connection closed');
    }
  }
}

export const databaseService = new DatabaseService();
