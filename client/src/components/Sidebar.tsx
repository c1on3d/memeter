import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface SidebarProps {
  migrationStats: {
    totalMigrations: number;
    avgMigrationTime: number;
    successRate: number;
  } | undefined;
  connectionStatus: string;
}

export function Sidebar({ migrationStats, connectionStatus }: SidebarProps) {
  const { data: tokenCount } = useQuery<{
    tokens: any[];
  }>({
    queryKey: ["/api/tokens", { limit: 1000 }],
    refetchInterval: 30000,
  });

  // Calculate dynamic metrics from real data
  const totalTokens = tokenCount?.tokens.length || 0;
  const activeTokensWithVolume = tokenCount?.tokens.filter(token => 
    token.metrics && parseFloat(token.metrics.volume24h || '0') > 1000
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Migrations</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-today-migrations">
              {migrationStats?.totalMigrations || 0}
            </div>
            <div className="text-xs text-blue-500">All-time successful</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Tokens</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-active-streams">{activeTokensWithVolume}</div>
            <div className="text-xs text-blue-500">
              {connectionStatus === 'connected' ? 'Live tracking' : 'Disconnected'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Tokens</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-avg-migration-time">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">In database</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-success-rate">
              {migrationStats?.successRate ? `${Math.round(migrationStats.successRate)}%` : '100%'}
            </div>
            <div className="text-xs text-green-500">Migration completion</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
