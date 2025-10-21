import { Sequelize, Op } from 'sequelize';
import type { AppConfig } from '../config/appConfig';
import { Token, Migration, defineModels } from './models';

export class DatabaseService {
  private sequelize: Sequelize | null = null;
  private config: AppConfig['database'];
  private isInitialized: boolean = false;

  constructor(config: AppConfig['database']) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config) {
      throw new Error('Database configuration not provided');
    }

    try {
      this.sequelize = new Sequelize({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        username: this.config.username,
        password: this.config.password,
        dialect: this.config.dialect,
        logging: this.config.logging ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          timestamps: true,
          underscored: false,
        },
      });

      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully');

      // Define models
      defineModels(this.sequelize);
      console.log('✅ Database models defined');

      // Sync models (creates tables if they don't exist)
      await this.sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  getSequelize(): Sequelize | null {
    return this.sequelize;
  }

  isReady(): boolean {
    return this.isInitialized && this.sequelize !== null;
  }

  async close(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      console.log('✅ Database connection closed');
      this.isInitialized = false;
    }
  }

  // Token operations
  async saveToken(tokenData: any): Promise<Token | null> {
    if (!this.isReady()) {
      console.warn('⚠️ Database not initialized, skipping token save');
      return null;
    }

    try {
      const [token, created] = await Token.upsert({
        mint: tokenData.mint,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals || 6,
        uri: tokenData.uri,
        description: tokenData.description,
        image: tokenData.image,
        creator: tokenData.creator,
        marketCap: tokenData.marketCap,
        marketCapSol: tokenData.marketCapSol,
        volume24h: tokenData.volume24h,
        price: tokenData.price,
        pool: tokenData.pool,
        website: tokenData.website,
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
        discord: tokenData.discord,
        youtube: tokenData.youtube,
        instagram: tokenData.instagram,
        reddit: tokenData.reddit,
        tiktok: tokenData.tiktok,
      });

      if (created) {
        console.log(`✅ Token saved to database: ${tokenData.symbol} (${tokenData.mint})`);
      }

      return token;
    } catch (error) {
      console.error('❌ Error saving token to database:', error);
      return null;
    }
  }

  async getRecentTokens(limit: number = 100): Promise<Token[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const tokens = await Token.findAll({
        order: [['createdAt', 'DESC']],
        limit,
      });
      return tokens;
    } catch (error) {
      console.error('❌ Error fetching tokens from database:', error);
      return [];
    }
  }

  async getTokenByMint(mint: string): Promise<Token | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const token = await Token.findOne({
        where: { mint },
      });
      return token;
    } catch (error) {
      console.error('❌ Error fetching token from database:', error);
      return null;
    }
  }

  async searchTokens(query: string, limit: number = 20): Promise<Token[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const tokens = await Token.findAll({
        where: {
          [Op.or]: [
            { symbol: { [Op.iLike]: `%${query}%` } },
            { name: { [Op.iLike]: `%${query}%` } },
            { mint: { [Op.iLike]: `%${query}%` } },
          ],
        },
        order: [['createdAt', 'DESC']],
        limit,
      });
      return tokens;
    } catch (error) {
      console.error('❌ Error searching tokens in database:', error);
      return [];
    }
  }

  // Migration operations
  async saveMigration(migrationData: any): Promise<Migration | null> {
    if (!this.isReady()) {
      console.warn('⚠️ Database not initialized, skipping migration save');
      return null;
    }

    try {
      const migration = await Migration.create({
        tokenMint: migrationData.tokenMint,
        tokenName: migrationData.tokenName,
        tokenSymbol: migrationData.tokenSymbol,
        fromRaydium: migrationData.fromRaydium || false,
        toRaydium: migrationData.toRaydium || true,
        marketCapAtMigration: migrationData.marketCapAtMigration,
        volumeAtMigration: migrationData.volumeAtMigration,
        migrationTime: migrationData.migrationTime || new Date(),
      });

      console.log(`✅ Migration saved to database: ${migrationData.tokenSymbol} (${migrationData.tokenMint})`);
      return migration;
    } catch (error) {
      console.error('❌ Error saving migration to database:', error);
      return null;
    }
  }

  async getRecentMigrations(limit: number = 100): Promise<Migration[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const migrations = await Migration.findAll({
        order: [['migrationTime', 'DESC']],
        limit,
      });
      return migrations;
    } catch (error) {
      console.error('❌ Error fetching migrations from database:', error);
      return [];
    }
  }

  async getMigrationByTokenMint(tokenMint: string): Promise<Migration | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const migration = await Migration.findOne({
        where: { tokenMint },
        order: [['migrationTime', 'DESC']],
      });
      return migration;
    } catch (error) {
      console.error('❌ Error fetching migration from database:', error);
      return null;
    }
  }

  // Statistics
  async getStats(): Promise<{ totalTokens: number; totalMigrations: number }> {
    if (!this.isReady()) {
      return { totalTokens: 0, totalMigrations: 0 };
    }

    try {
      const [totalTokens, totalMigrations] = await Promise.all([
        Token.count(),
        Migration.count(),
      ]);

      return { totalTokens, totalMigrations };
    } catch (error) {
      console.error('❌ Error fetching database stats:', error);
      return { totalTokens: 0, totalMigrations: 0 };
    }
  }
}

export default DatabaseService;
