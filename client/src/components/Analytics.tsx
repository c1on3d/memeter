import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Timer, Target, BarChart3 } from "lucide-react";

interface SolanaNetworkStats {
  volume24h: number;
  marketCap: number;
  price: number;
  percentChange24h: number;
  formattedVolume24h: string;
  formattedMarketCap: string;
  formattedPrice: string;
}

export function Analytics() {

  // Get real tokens that have met migration threshold today
  const { data: tokensReadyData } = useQuery<{
    tokensReadyToMigrate: number;
    tokensNearThreshold: number;
    thresholdUSD: number;
    thresholdSOL: number;
    qualifiedTokens: any[];
    source: string;
  }>({
    queryKey: ["/api/analytics/tokens-ready-to-migrate"],
    refetchInterval: 10000, // Update every 10 seconds for live data
  });

  const { data: migrationStats } = useQuery<{
    totalMigrations: number;
    avgMigrationTime: number;
    successRate: number;
  }>({
    queryKey: ["/api/analytics/migrations"],
    refetchInterval: 8000, // Update every 8 seconds for live data
  });

  // Get live count of recent tokens (last 6 hours) from dedicated endpoint
  const { data: recentTokensData } = useQuery<{
    recentTokens: number;
  }>({
    queryKey: ["/api/analytics/recent-tokens"],
    refetchInterval: 3000, // Update every 3 seconds for faster live updates
  });

  // Get live count of total tokens (all time) from dedicated endpoint
  const { data: totalTokensData } = useQuery<{
    totalTokens: number;
  }>({
    queryKey: ["/api/analytics/total-tokens"],
    refetchInterval: 5000, // Update every 5 seconds for live data
  });

  // Get real Solana network statistics (24h volume, market cap, etc.)
  const { data: solanaNetworkStats } = useQuery<SolanaNetworkStats>({
    queryKey: ["/api/analytics/solana-network"],
    refetchInterval: 5000, // Update every 5 seconds for real-time price tracking
  });

  // Get current migration threshold from PumpSwap API
  const { data: migrationThresholdData } = useQuery<{
    thresholdSOL: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    sampleSize: number;
    source: string;
  }>({
    queryKey: ["/api/analytics/migration-threshold"],
    refetchInterval: 10000, // Update every 10 seconds for responsive threshold tracking
  });

  const { data: tokensData } = useQuery<{ tokens: any[] }>({
    queryKey: ["/api/tokens", { limit: 1000 }],
    refetchInterval: 10000,
  });

  
  // Use live count from API and calculate deployment rate
  const recentTokens = recentTokensData?.recentTokens || 0;
  const totalTokens = totalTokensData?.totalTokens || 0;
  const tokensPerHour = Math.round(recentTokens / 6); // Tokens deployed per hour in last 6h

  // Live migration threshold: actual threshold from PumpSwap API * current SOL price
  const currentThresholdSOL = migrationThresholdData?.thresholdSOL || 85;
  const migrationThresholdUSD = solanaNetworkStats?.price ? (currentThresholdSOL * solanaNetworkStats.price) : null;


  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Tokens Created</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-blue-400" data-testid="text-total-tokens">
                    {totalTokens.toLocaleString()}
                  </p>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updating"></div>
                </div>
                <p className="text-xs text-blue-500 mt-1">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  {recentTokens.toLocaleString()} in last 6h (~{tokensPerHour}/hr)
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Migration Threshold</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-green-400" data-testid="text-migration-threshold">
                    {migrationThresholdUSD ? `$${migrationThresholdUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'Loading...'}
                  </p>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updating"></div>
                </div>
                <p className="text-xs text-green-500 mt-1">
                  <Target className="inline w-3 h-3 mr-1" />
                  {currentThresholdSOL} SOL market cap to Raydium
                  {migrationThresholdData?.confidenceLevel && (
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                      migrationThresholdData.confidenceLevel === 'high' ? 'bg-green-500/20 text-green-400' :
                      migrationThresholdData.confidenceLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {migrationThresholdData.confidenceLevel}
                    </span>
                  )}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-600/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Solana 24h Volume</p>
                <p className="text-2xl font-bold text-purple-400" data-testid="text-daily-volume">
                  {solanaNetworkStats?.formattedVolume24h || 'Loading...'}
                </p>
                <p className="text-xs text-purple-500 mt-1 flex items-center">
                  {solanaNetworkStats?.percentChange24h !== undefined && (
                    <>
                      {solanaNetworkStats.percentChange24h >= 0 ? (
                        <TrendingUp className="inline w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline w-3 h-3 mr-1" />
                      )}
                      <span className={solanaNetworkStats.percentChange24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {solanaNetworkStats.percentChange24h >= 0 ? '+' : ''}{solanaNetworkStats.percentChange24h.toFixed(2)}%
                      </span>
                      <span className="ml-1 text-purple-500">24h</span>
                    </>
                  )}
                  {!solanaNetworkStats && (
                    <>
                      <TrendingUp className="inline w-3 h-3 mr-1" />
                      Real-time Network Data
                    </>
                  )}
                </p>
              </div>
              <Timer className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-600/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-400 uppercase tracking-wide">Tokens Ready to Migrate Today</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-orange-400" data-testid="text-tokens-ready">
                    {tokensReadyData?.tokensReadyToMigrate || 0}
                  </p>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Live updating"></div>
                </div>
                <p className="text-xs text-orange-500 mt-1">
                  <Target className="inline w-3 h-3 mr-1" />
                  {tokensReadyData?.tokensNearThreshold || 0} near threshold ({tokensReadyData ? `$${tokensReadyData.thresholdUSD.toLocaleString()}` : '$98K'}+)
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
