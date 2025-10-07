import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface MigrationEvent {
  id: string;
  token: {
    name: string;
    symbol: string;
    address: string;
  };
  migration: {
    migrationTimestamp: string;
    preMigrationMarketCap: string;
  };
  metrics?: {
    volume24h: string;
    marketCap: string;
  };
  type: 'migration' | 'threshold_alert' | 'graduate';
}

interface TokenRating {
  score: number;
  grade: string;
  color: string;
}

// Helper function to format currency amounts with K/M/B notation
const formatCurrencyShort = (value?: string | number): string => {
  if (!value || value === '0' || value === '0.00000000' || parseFloat(value.toString()) === 0) return 'N/A';
  const num = parseFloat(value.toString());
  if (isNaN(num)) return 'N/A';
  
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  } else if (num >= 1) {
    return `$${Math.round(num)}`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

export function MigrationFeed() {
  const [liveEvents, setLiveEvents] = useState<MigrationEvent[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const calculateTokenRating = (event: MigrationEvent): TokenRating => {
    const marketCap = parseFloat(event.metrics?.marketCap || event.migration.preMigrationMarketCap || '0');
    const volume = parseFloat(event.metrics?.volume24h || '0');
    
    let score = 0;
    
    // Market cap scoring (0-30 points)
    if (marketCap >= 100000) score += 30;
    else if (marketCap >= 50000) score += 25;
    else if (marketCap >= 30000) score += 20;
    else if (marketCap >= 10000) score += 15;
    else score += 10;
    
    // Volume scoring (0-50 points) - higher weight for volume performance
    if (volume >= 100000) score += 50;
    else if (volume >= 50000) score += 40;
    else if (volume >= 20000) score += 30;
    else if (volume >= 10000) score += 25;
    else if (volume >= 5000) score += 15;
    else if (volume >= 1000) score += 10;
    
    // Performance bonus (20 points)
    if (event.type === 'graduate') score += 20; // High volume tokens
    else score += 10; // Active tokens
    
    // Normalize to 0-100
    score = Math.min(100, Math.max(0, score));
    
    let grade: string;
    let color: string;
    
    if (score >= 90) { grade = 'S+'; color = 'text-purple-400'; }
    else if (score >= 80) { grade = 'S'; color = 'text-green-400'; }
    else if (score >= 70) { grade = 'A'; color = 'text-blue-400'; }
    else if (score >= 60) { grade = 'B'; color = 'text-yellow-400'; }
    else if (score >= 50) { grade = 'C'; color = 'text-orange-400'; }
    else { grade = 'D'; color = 'text-red-400'; }
    
    return { score, grade, color };
  };

  // Fetch recent token migrations
  const { data: migrationData } = useQuery<{ migrations: any[] }>({
    queryKey: ["/api/migrations/recent"],
    refetchInterval: 30000, // Refresh every 30 seconds for live migration data
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Token Migrations</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground" data-testid="text-migrations-live">
              Database • Token migration tracking
            </span>
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {!migrationData?.migrations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-lg mb-2">🚀</div>
              <p>Loading migration events...</p>
              <p className="text-sm">Recent token migrations will appear here</p>
            </div>
          ) : (
            migrationData.migrations.slice(0, 10).map((event) => {
              const rating = calculateTokenRating(event);
              return (
                <div 
                  key={event.id}
                  className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  data-testid={`migration-event-${event.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`text-xs font-bold px-2 py-1 rounded ${rating.color} bg-opacity-20`}>
                        {rating.grade}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {event.token.name} ({event.token.symbol})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Market Cap: {formatCurrencyShort(event.metrics?.marketCap || event.migration.preMigrationMarketCap)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-500">
                      Volume: {formatCurrencyShort(event.metrics?.volume24h)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.migration.migrationTimestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
