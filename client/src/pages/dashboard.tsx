import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { Search, Wallet, TrendingUp, Activity, Timer, Target, RefreshCw, ExternalLinkIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { buildApiUrl, API_ENDPOINTS } from "@/lib/api";

// Token Image Component - with IPFS gateway fallbacks
function TokenImage({ mint, symbol, uri, directImage }: { mint: string, symbol: string, uri?: string | null, directImage?: string | null }) {
  const imageUrl = directImage || uri; // Fallback to URI if no direct image
  
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {imageUrl && (
        <img 
          src={imageUrl}
          alt={symbol}
          className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Try alternate IPFS gateways if primary fails
            if (target.src.includes('ipfs.io')) {
              target.src = target.src.replace('ipfs.io', 'dweb.link');
            } else if (target.src.includes('dweb.link')) {
              target.src = target.src.replace('dweb.link', 'cf-ipfs.com');
            } else if (target.src.includes('cf-ipfs.com')) {
              target.src = target.src.replace('cf-ipfs.com', 'gateway.pinata.cloud');
            } else {
              // All gateways failed, hide image
              target.style.display = 'none';
            }
          }}
        />
      )}
      <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
        {symbol?.charAt(0)?.toUpperCase() || 'T'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Authentication check - redirect to landing if not authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('memeter_authenticated');
    if (!isAuthenticated) {
      console.log('Dashboard access denied - not authenticated, redirecting to landing');
      setLocation('/');
    }
  }, [setLocation]);

  const { theme } = useTheme();
  const { toast } = useToast();
  const { toggleCategorizedFavorite, isFavorite } = useFavorites();

  // Wallet connection
  const { connected, publicKey, connect, disconnect, isPhantomInstalled } = usePhantomWallet();

  // Fetch new tokens from backend
  const { data: newTokensData, refetch: refetchNewTokens, isLoading: isLoadingNewTokens, error: newTokensError } = useQuery({
    queryKey: ['newTokens'],
    queryFn: async () => {
      console.log('🔵 Fetching new tokens from:', buildApiUrl(API_ENDPOINTS.NEW_TOKENS));
      const response = await fetch(buildApiUrl(API_ENDPOINTS.NEW_TOKENS));
      if (!response.ok) {
        console.error('❌ Failed to fetch new tokens:', response.status, response.statusText);
        throw new Error('Failed to fetch new tokens');
      }
      const data = await response.json();
      console.log('✅ New tokens received:', data.count, 'tokens, showing:', data.tokens?.length);
      console.log('📊 First token:', data.tokens?.[0]);
      return data; // Returns { message, tokens: [...], count }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3,
  });

  // Fetch all tokens
  const { data: allTokensData, refetch: refetchTokens } = useQuery({
    queryKey: ['allTokens'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.TOKENS));
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      return data;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch DexScreener latest data
  const { data: dexScreenerData, refetch: refetchDexScreener } = useQuery({
    queryKey: ['dexScreener'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.DEXSCREENER_LATEST));
      if (!response.ok) throw new Error('Failed to fetch DexScreener data');
      return response.json();
    },
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  // Calculate stats from fetched data - handle the actual backend response structure
  const rawNewTokens = newTokensData?.tokens || [];
  // Sort tokens by timestamp (newest first)
  const newTokens = [...rawNewTokens].sort((a: any, b: any) => {
    const dateA = new Date(a.timestamp || 0).getTime();
    const dateB = new Date(b.timestamp || 0).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
  
  const allTokens = allTokensData?.tokens || (Array.isArray(allTokensData) ? allTokensData : []);
  const solanaPrice = 150.00; // Can be updated from backend if available
  const totalTokens = newTokensData?.count || newTokens.length || 0;
  const tokensPerHour = Math.floor(totalTokens / 24) || 0;
  const totalMigrations = 0; // Backend doesn't have migrations endpoint yet
  const readyToMigrate = 0;
  const trendingCount = dexScreenerData?.pairs?.length || 0;

  // Debug logging
  useEffect(() => {
    console.log('📈 Dashboard State:', {
      isLoadingNewTokens,
      newTokensError: newTokensError?.message,
      newTokensCount: newTokens.length,
      totalTokens,
      hasData: !!newTokensData,
    });
  }, [isLoadingNewTokens, newTokensError, newTokens.length, totalTokens, newTokensData]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${value}"`,
      });
    }
  };
  
  const handleWalletConnect = async () => {
    if (!isPhantomInstalled) {
      toast({
        title: "Phantom Wallet Required",
        description: "Please install the Phantom wallet extension to continue.",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return;
    }
    
    try {
      if (connected) {
        await disconnect();
        localStorage.removeItem('memeter_authenticated');
        toast({
          title: "Wallet Disconnected",
          description: "Your Phantom wallet has been disconnected.",
        });
      } else {
        await connect();
        toast({
          title: "Wallet Connected",
          description: "Your Phantom wallet is now connected.",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-black sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo - Memeter logo SVG */}
              <div className="relative w-32 h-32">
                <img 
                  src="/memeter-logo.svg" 
                  alt="Memeter Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search tokens by address, symbol, or name..."
                  className="pl-10 w-96"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              
              {/* Live Solana Price */}
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-2xl text-white transform -skew-x-6 drop-shadow-lg animate-pulse hover:scale-105 transition-transform duration-300">◎</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">
                    ${solanaPrice.toFixed(2)}
                  </span>
                  <span className="text-xs font-medium text-green-500">
                    +0.00%
                  </span>
                </div>
              </div>
              
              <Button 
                variant="secondary" 
                size="sm" 
                asChild 
                className="hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/20 hover:shadow-orange-500/25"
              >
                <Link href="/favorites">
                  <Star className="h-4 w-4 mr-2 transition-transform duration-200 hover:scale-110" />
                  Favorites
                </Link>
              </Button>
              
              <Button 
                variant={connected ? "default" : "secondary"} 
                size="sm" 
                onClick={handleWalletConnect}
                className={`hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20 hover:shadow-green-500/25 ${connected ? 
                  "bg-green-600 hover:bg-green-700 hover:scale-105 hover:shadow-lg transition-all duration-200" : 
                  ""
                }`}
              >
                <Wallet className="h-4 w-4 mr-2 transition-transform duration-200 hover:scale-110" />
                {connected ? 
                  `${publicKey?.slice(0, 4)}...${publicKey?.slice(-4)}` : 
                  "Wallet"
                }
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New Tokens Created</p>
                  <p className="text-3xl font-bold text-blue-600">{totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Activity className="inline h-3 w-3 mr-1" />
                    {tokensPerHour}/hour
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recently Migrated</p>
                  <p className="text-3xl font-bold text-green-600">{totalMigrations}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Timer className="inline h-3 w-3 mr-1" />
                    Last 24h
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to Migrate</p>
                  <p className="text-3xl font-bold text-purple-600">{readyToMigrate}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1 animate-pulse"></div>
                      Ready
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trending Tokens</p>
                  <p className="text-3xl font-bold text-orange-600">{trendingCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    Top performers
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* New Tokens Created */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                New Tokens Created
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8 w-8 p-0 hover:bg-orange-500/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[600px] max-h-[800px] overflow-y-auto space-y-3">
              {isLoadingNewTokens ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading new tokens from backend...</p>
                  <p className="text-xs mt-2">Connecting to PumpPortal WebSocket...</p>
                </div>
              ) : newTokensError ? (
                <div className="text-center py-8 text-red-500">
                  <p>❌ Error loading tokens</p>
                  <p className="text-xs mt-2">{String(newTokensError)}</p>
                  <Button onClick={() => refetchNewTokens()} className="mt-4" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : newTokens.length > 0 ? (
                newTokens.slice(0, 30).map((token: any, index: number) => {
                  const marketCapUSD = token.marketCapSol ? (token.marketCapSol * solanaPrice).toFixed(2) : '0';
                  const launchpadUrl = token.pool === 'pump' 
                    ? `https://pump.fun/${token.mint}` 
                    : token.pool === 'bonk' 
                    ? `https://bonk.fun/${token.mint}`
                    : null;
                  
                  return (
                    <div key={token.mint || index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Token Image - Uses Pump.fun CDN */}
                          <TokenImage mint={token.mint} symbol={token.symbol} uri={token.uri} directImage={token.image} />
                          
                          <div>
                            <div className="font-medium text-sm">{token.name || token.symbol || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{token.symbol || 'N/A'}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">${Number(marketCapUSD).toLocaleString()}</div>
                            <div className="text-xs text-blue-500">{token.marketCapSol?.toFixed(2)} SOL</div>
                          </div>
                          
                          {/* Links */}
                          <div className="flex items-center space-x-1">
                            {/* Solscan Link */}
                            <a 
                              href={`https://solscan.io/token/${token.mint}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-blue-500 transition-colors"
                              title="View on Solscan"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                            
                            {/* Launchpad Link */}
                            {launchpadUrl && (
                              <a 
                                href={launchpadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  token.pool === 'pump' 
                                    ? 'text-green-500 hover:bg-green-500/10' 
                                    : 'text-blue-500 hover:bg-blue-500/10'
                                }`}
                                title={`View on ${token.pool === 'pump' ? 'Pump.fun' : 'Bonk.fun'}`}
                              >
                                {token.pool === 'pump' ? 'P' : 'B'}
                              </a>
                            )}
                            
                            {/* Favorite Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toggleCategorizedFavorite({
                                  mint: token.mint,
                                  category: 'new',
                                  name: token.name,
                                  symbol: token.symbol,
                                  marketCap: Number(marketCapUSD),
                                });
                                toast({
                                  title: isFavorite(token.mint) ? "Removed from Favorites" : "Added to Favorites",
                                  description: `${token.symbol} has been ${isFavorite(token.mint) ? 'removed from' : 'added to'} your favorites`,
                                });
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Star className={`h-3 w-3 ${isFavorite(token.mint) ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground'}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tokens available</p>
                  <p className="text-xs mt-2">Waiting for new tokens from PumpPortal...</p>
                  <Button onClick={() => refetchNewTokens()} className="mt-4" size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Recently Migrated */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                Recently Migrated
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8 w-8 p-0 hover:bg-orange-500/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[600px] max-h-[800px] overflow-y-auto space-y-3">
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent migrations</p>
                <p className="text-xs mt-2">Migrated tokens will appear here</p>
              </div>
            </div>
          </div>

          {/* Trending Tokens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                Trending Tokens
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchDexScreener()}
                className="h-8 w-8 p-0 hover:bg-orange-500/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[600px] max-h-[800px] overflow-y-auto space-y-3">
              {dexScreenerData?.pairs && dexScreenerData.pairs.length > 0 ? (
                dexScreenerData.pairs.slice(0, 30).map((pair: any, index: number) => {
                  return (
                    <div key={pair.pairAddress || index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Token Image */}
                          <div className="relative w-10 h-10">
                            {pair.info?.imageUrl && (
                              <img 
                                src={pair.info.imageUrl}
                                alt={pair.baseToken?.symbol}
                                className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                              {pair.baseToken?.symbol?.charAt(0)?.toUpperCase() || 'T'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-medium text-sm">{pair.baseToken?.name || pair.baseToken?.symbol || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{pair.baseToken?.symbol || 'N/A'}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(pair.priceChange?.h24 || 0).toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${(pair.volume?.h24 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                          
                          {/* Links */}
                          <div className="flex items-center space-x-1">
                            {/* DexScreener Link */}
                            <a 
                              href={`https://dexscreener.com/solana/${pair.pairAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-orange-500 transition-colors"
                              title="View on DexScreener"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                            
                            {/* Favorite Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toggleCategorizedFavorite({
                                  mint: pair.baseToken?.address || pair.pairAddress,
                                  category: 'trending',
                                  name: pair.baseToken?.name,
                                  symbol: pair.baseToken?.symbol,
                                  marketCap: pair.fdv || 0,
                                });
                                toast({
                                  title: isFavorite(pair.baseToken?.address || pair.pairAddress) ? "Removed from Favorites" : "Added to Favorites",
                                  description: `${pair.baseToken?.symbol} has been ${isFavorite(pair.baseToken?.address || pair.pairAddress) ? 'removed from' : 'added to'} your favorites`,
                                });
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Star className={`h-3 w-3 ${isFavorite(pair.baseToken?.address || pair.pairAddress) ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground'}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading trending tokens...</p>
                  <p className="text-xs mt-2">DexScreener data will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}