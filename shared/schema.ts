import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  creatorAddress: text("creator_address").notNull(),
  bondingCurveAddress: text("bonding_curve_address"),
  raydiumPoolAddress: text("raydium_pool_address"),
  metadata: jsonb("metadata"),
  socialLinks: jsonb("social_links"),
  dataSource: text("data_source").notNull().default("pumpportal"), // 'pumpportal' or 'letsbonk'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const migrations = pgTable("migrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: varchar("token_id").references(() => tokens.id).notNull(),
  migrationTimestamp: timestamp("migration_timestamp").notNull(),
  preMigrationMarketCap: decimal("pre_migration_market_cap", { precision: 20, scale: 8 }),
  initialLiquidity: decimal("initial_liquidity", { precision: 20, scale: 8 }),
  transactionSignature: text("transaction_signature").notNull(),
  blockHeight: integer("block_height"),
  migrationStatus: text("migration_status").notNull().default("completed"),
});

export const tokenMetrics = pgTable("token_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: varchar("token_id").references(() => tokens.id).notNull(),
  marketCap: decimal("market_cap", { precision: 20, scale: 8 }),
  volume24h: decimal("volume_24h", { precision: 20, scale: 8 }),
  holderCount: integer("holder_count"),
  riskScore: integer("risk_score"),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 4 }),
  liquidityUsd: decimal("liquidity_usd", { precision: 20, scale: 8 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const riskAnalysis = pgTable("risk_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: varchar("token_id").references(() => tokens.id).notNull(),
  holderDistribution: jsonb("holder_distribution"),
  devWalletActivity: jsonb("dev_wallet_activity"),
  liquidityRisk: integer("liquidity_risk"),
  holderRisk: integer("holder_risk"),
  tradingRisk: integer("trading_risk"),
  overallRisk: integer("overall_risk"),
  analysisTimestamp: timestamp("analysis_timestamp").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: varchar("token_id").references(() => tokens.id).notNull(),
  alertType: text("alert_type").notNull(),
  conditions: jsonb("conditions"),
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signature: text("signature").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull().default(sql`NOW() + INTERVAL '24 hours'`),
});

export const tokenImageResolutions = pgTable("token_image_resolutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: text("token_address").notNull().unique(),
  resolvedUrl: text("resolved_url"),
  source: text("source"), // 'metadata', 'pump.fun', 'dexscreener', etc.
  status: text("status").notNull(), // 'resolved', 'failed', 'pending'
  lastChecked: timestamp("last_checked").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Relations
export const tokensRelations = relations(tokens, ({ many, one }) => ({
  migrations: many(migrations),
  metrics: many(tokenMetrics),
  riskAnalysis: many(riskAnalysis),
  alerts: many(alerts),
}));

export const migrationsRelations = relations(migrations, ({ one }) => ({
  token: one(tokens, {
    fields: [migrations.tokenId],
    references: [tokens.id],
  }),
}));

export const tokenMetricsRelations = relations(tokenMetrics, ({ one }) => ({
  token: one(tokens, {
    fields: [tokenMetrics.tokenId],
    references: [tokens.id],
  }),
}));

export const riskAnalysisRelations = relations(riskAnalysis, ({ one }) => ({
  token: one(tokens, {
    fields: [riskAnalysis.tokenId],
    references: [tokens.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  token: one(tokens, {
    fields: [alerts.tokenId],
    references: [tokens.id],
  }),
}));

// No relations for webhookEvents as it's standalone

// Insert schemas
export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  createdAt: true,
});

export const insertMigrationSchema = createInsertSchema(migrations).omit({
  id: true,
});

export const insertTokenMetricsSchema = createInsertSchema(tokenMetrics).omit({
  id: true,
  updatedAt: true,
});

export const insertRiskAnalysisSchema = createInsertSchema(riskAnalysis).omit({
  id: true,
  analysisTimestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  lastTriggered: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  processedAt: true,
  expiresAt: true,
});

export const insertTokenImageResolutionSchema = createInsertSchema(tokenImageResolutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Token = typeof tokens.$inferSelect;
export type Migration = typeof migrations.$inferSelect;
export type TokenMetrics = typeof tokenMetrics.$inferSelect;
export type RiskAnalysis = typeof riskAnalysis.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type TokenImageResolution = typeof tokenImageResolutions.$inferSelect;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertMigration = z.infer<typeof insertMigrationSchema>;
export type InsertTokenMetrics = z.infer<typeof insertTokenMetricsSchema>;
export type InsertRiskAnalysis = z.infer<typeof insertRiskAnalysisSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type InsertTokenImageResolution = z.infer<typeof insertTokenImageResolutionSchema>;
