import { 
  tokens, 
  migrations, 
  tokenMetrics, 
  riskAnalysis, 
  alerts,
  webhookEvents,
  tokenImageResolutions,
  type Token, 
  type Migration, 
  type TokenMetrics, 
  type RiskAnalysis, 
  type Alert,
  type WebhookEvent,
  type TokenImageResolution,
  type InsertToken, 
  type InsertMigration, 
  type InsertTokenMetrics, 
  type InsertRiskAnalysis,
  type InsertAlert,
  type InsertWebhookEvent,
  type InsertTokenImageResolution 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, like } from "drizzle-orm";

// Helper function to check if database is available
function isDatabaseAvailable(): boolean {
  return db !== null;
}

export interface IStorage {
  // Token operations
  getToken(id: string): Promise<Token | undefined>;
  getTokenByAddress(address: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;
  updateToken(id: string, updates: Partial<InsertToken>): Promise<Token>;
  searchTokens(query: string): Promise<Token[]>;
  getTokensWithMetrics(limit?: number, offset?: number): Promise<(Token & { metrics?: TokenMetrics; migration?: Migration })[]>;
  
  // Migration operations
  createMigration(migration: InsertMigration): Promise<Migration>;
  getMigrationsByToken(tokenId: string): Promise<Migration[]>;
  getRecentMigrations(limit?: number): Promise<(Migration & { token: Token })[]>;
  
  // Metrics operations
  upsertTokenMetrics(metrics: InsertTokenMetrics): Promise<TokenMetrics>;
  getLatestMetrics(tokenId: string): Promise<TokenMetrics | undefined>;
  
  // Risk analysis operations
  createRiskAnalysis(analysis: InsertRiskAnalysis): Promise<RiskAnalysis>;
  getLatestRiskAnalysis(tokenId: string): Promise<RiskAnalysis | undefined>;
  
  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlerts(): Promise<(Alert & { token: Token })[]>;
  
  // Analytics
  getMigrationStats(hoursBack?: number): Promise<{
    totalMigrations: number;
    avgMigrationTime: number;
    successRate: number;
  }>;
  getRiskDistribution(): Promise<{
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  }>;
  
  // Webhook idempotency operations
  checkWebhookProcessed(signature: string): Promise<boolean>;
  markWebhookProcessed(signature: string, eventType: string): Promise<WebhookEvent>;
  cleanupExpiredWebhookEvents(): Promise<number>;
  
  // Token image resolution operations
  getTokenImageResolution(tokenAddress: string): Promise<TokenImageResolution | undefined>;
  upsertTokenImageResolution(resolution: InsertTokenImageResolution): Promise<TokenImageResolution>;
  deleteTokenImageResolution(tokenAddress: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getToken(id: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token || undefined;
  }

  async getTokenByAddress(address: string): Promise<Token | undefined> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    const [token] = await db.select().from(tokens).where(eq(tokens.address, address));
    return token || undefined;
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    const [token] = await db
      .insert(tokens)
      .values(insertToken)
      .returning();
    return token;
  }

  async searchTokens(query: string): Promise<Token[]> {
    return await db
      .select()
      .from(tokens)
      .where(
        sql`${tokens.name} ILIKE ${`%${query}%`} OR ${tokens.symbol} ILIKE ${`%${query}%`} OR ${tokens.address} ILIKE ${`%${query}%`}`
      )
      .limit(20);
  }

  async updateToken(id: string, updates: Partial<InsertToken>): Promise<Token> {
    const [token] = await db
      .update(tokens)
      .set(updates)
      .where(eq(tokens.id, id))
      .returning();
    return token;
  }

  async getTokensWithMetrics(limit: number = 50, offset: number = 0): Promise<(Token & { metrics?: TokenMetrics; migration?: Migration })[]> {
    const results = await db
      .select({
        token: tokens,
        metrics: tokenMetrics,
        migration: migrations,
      })
      .from(tokens)
      .leftJoin(tokenMetrics, eq(tokens.id, tokenMetrics.tokenId))
      .leftJoin(migrations, eq(tokens.id, migrations.tokenId))
      .orderBy(desc(tokens.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(result => ({
      ...result.token,
      metrics: result.metrics || undefined,
      migration: result.migration || undefined,
    }));
  }

  async createMigration(insertMigration: InsertMigration): Promise<Migration> {
    const [migration] = await db
      .insert(migrations)
      .values(insertMigration)
      .returning();
    return migration;
  }

  async getMigrationsByToken(tokenId: string): Promise<Migration[]> {
    return await db
      .select()
      .from(migrations)
      .where(eq(migrations.tokenId, tokenId))
      .orderBy(desc(migrations.migrationTimestamp));
  }

  async getRecentMigrations(limit: number = 10): Promise<(Migration & { token: Token })[]> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    const results = await db
      .select({
        migration: migrations,
        token: tokens,
      })
      .from(migrations)
      .innerJoin(tokens, eq(migrations.tokenId, tokens.id))
      .orderBy(desc(migrations.migrationTimestamp))
      .limit(limit);

    return results.map(result => ({
      ...result.migration,
      token: result.token,
    }));
  }

  async createTokenMetrics(insertMetrics: InsertTokenMetrics): Promise<TokenMetrics> {
    const [metrics] = await db
      .insert(tokenMetrics)
      .values(insertMetrics)
      .returning();
    return metrics;
  }

  async upsertTokenMetrics(insertMetrics: InsertTokenMetrics): Promise<TokenMetrics> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    // First try to find existing metrics
    const existing = await this.getLatestMetrics(insertMetrics.tokenId);
    
    if (existing) {
      // Update existing metrics
      const [metrics] = await db
        .update(tokenMetrics)
        .set({
          marketCap: insertMetrics.marketCap,
          volume24h: insertMetrics.volume24h,
          holderCount: insertMetrics.holderCount,
          riskScore: insertMetrics.riskScore,
          priceChange24h: insertMetrics.priceChange24h,
          liquidityUsd: insertMetrics.liquidityUsd,
          updatedAt: sql`now()`,
        })
        .where(eq(tokenMetrics.id, existing.id))
        .returning();
      return metrics;
    } else {
      // Create new metrics
      return await this.createTokenMetrics(insertMetrics);
    }
  }

  async getLatestMetrics(tokenId: string): Promise<TokenMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(tokenMetrics)
      .where(eq(tokenMetrics.tokenId, tokenId))
      .orderBy(desc(tokenMetrics.updatedAt))
      .limit(1);
    return metrics || undefined;
  }

  async createRiskAnalysis(insertAnalysis: InsertRiskAnalysis): Promise<RiskAnalysis> {
    const [analysis] = await db
      .insert(riskAnalysis)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getLatestRiskAnalysis(tokenId: string): Promise<RiskAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(riskAnalysis)
      .where(eq(riskAnalysis.tokenId, tokenId))
      .orderBy(desc(riskAnalysis.analysisTimestamp))
      .limit(1);
    return analysis || undefined;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async getActiveAlerts(): Promise<(Alert & { token: Token })[]> {
    const results = await db
      .select({
        alert: alerts,
        token: tokens,
      })
      .from(alerts)
      .innerJoin(tokens, eq(alerts.tokenId, tokens.id))
      .where(eq(alerts.isActive, true));

    return results.map(result => ({
      ...result.alert,
      token: result.token,
    }));
  }

  async getMigrationStats(hoursBack: number = 24): Promise<{
    totalMigrations: number;
    avgMigrationTime: number;
    successRate: number;
  }> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const [stats] = await db
      .select({
        totalMigrations: sql<number>`count(*)`,
        successRate: sql<number>`case when count(*) = 0 then 0 else (count(case when migration_status = 'completed' then 1 end) * 100.0 / count(*)) end`,
      })
      .from(migrations)
      .where(gte(migrations.migrationTimestamp, cutoffTime));

    return {
      totalMigrations: stats?.totalMigrations || 0,
      avgMigrationTime: 4.2, // Mock value - would need to calculate from blockchain data
      successRate: stats?.successRate || 0,
    };
  }

  async getRiskDistribution(): Promise<{
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  }> {
    const [distribution] = await db
      .select({
        lowRisk: sql<number>`count(case when risk_score between 1 and 3 then 1 end)`,
        mediumRisk: sql<number>`count(case when risk_score between 4 and 6 then 1 end)`,
        highRisk: sql<number>`count(case when risk_score between 7 and 10 then 1 end)`,
      })
      .from(tokenMetrics);

    return {
      lowRisk: distribution?.lowRisk || 0,
      mediumRisk: distribution?.mediumRisk || 0,
      highRisk: distribution?.highRisk || 0,
    };
  }

  async checkWebhookProcessed(signature: string): Promise<boolean> {
    // Clean up expired events first
    await this.cleanupExpiredWebhookEvents();
    
    const [event] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.signature, signature))
      .limit(1);
    
    return !!event;
  }

  async markWebhookProcessed(signature: string, eventType: string): Promise<WebhookEvent> {
    const [event] = await db
      .insert(webhookEvents)
      .values({
        signature,
        eventType,
      })
      .returning();
    return event;
  }

  async cleanupExpiredWebhookEvents(): Promise<number> {
    const result = await db
      .delete(webhookEvents)
      .where(sql`${webhookEvents.expiresAt} < NOW()`);
    
    // Return the number of affected rows
    return result.rowCount || 0;
  }

  async getTokenImageResolution(tokenAddress: string): Promise<TokenImageResolution | undefined> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    const [resolution] = await db
      .select()
      .from(tokenImageResolutions)
      .where(eq(tokenImageResolutions.tokenAddress, tokenAddress))
      .limit(1);
    return resolution || undefined;
  }

  async upsertTokenImageResolution(insertResolution: InsertTokenImageResolution): Promise<TokenImageResolution> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available');
    }
    const existing = await this.getTokenImageResolution(insertResolution.tokenAddress);
    
    if (existing) {
      // Update existing resolution
      const [resolution] = await db
        .update(tokenImageResolutions)
        .set({
          resolvedUrl: insertResolution.resolvedUrl,
          source: insertResolution.source,
          status: insertResolution.status,
          lastChecked: insertResolution.lastChecked,
          updatedAt: sql`now()`,
        })
        .where(eq(tokenImageResolutions.tokenAddress, insertResolution.tokenAddress))
        .returning();
      return resolution;
    } else {
      // Create new resolution
      const [resolution] = await db
        .insert(tokenImageResolutions)
        .values(insertResolution)
        .returning();
      return resolution;
    }
  }

  async deleteTokenImageResolution(tokenAddress: string): Promise<void> {
    await db
      .delete(tokenImageResolutions)
      .where(eq(tokenImageResolutions.tokenAddress, tokenAddress));
  }
}

export const storage = new DatabaseStorage();
