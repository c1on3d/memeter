export interface Token {
  id: string;
  address: string;
  name: string;
  symbol: string;
  creatorAddress: string;
  bondingCurveAddress?: string;
  raydiumPoolAddress?: string;
  metadata?: any;
  socialLinks?: any;
  dataSource: string;
  createdAt: string;
}

export interface Migration {
  id: string;
  tokenId: string;
  migrationTimestamp: string;
  preMigrationMarketCap?: string;
  initialLiquidity?: string;
  transactionSignature: string;
  blockHeight?: number;
  migrationStatus: string;
}

export interface TokenMetrics {
  id: string;
  tokenId: string;
  marketCap?: string;
  volume24h?: string;
  holderCount?: number;
  riskScore?: number;
  priceChange24h?: string;
  liquidityUsd?: string;
  updatedAt: string;
}

export interface RiskAnalysis {
  id: string;
  tokenId: string;
  holderDistribution?: any;
  devWalletActivity?: any;
  liquidityRisk?: number;
  holderRisk?: number;
  tradingRisk?: number;
  overallRisk?: number;
  analysisTimestamp: string;
}

export interface Alert {
  id: string;
  tokenId: string;
  alertType: string;
  conditions?: any;
  isActive?: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface TokenWithMetrics extends Token {
  metrics?: TokenMetrics;
  migration?: Migration;
  riskAnalysis?: RiskAnalysis;
}

export interface MigrationStats {
  totalMigrations: number;
  avgMigrationTime: number;
  successRate: number;
}

export interface RiskDistribution {
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
}
