import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MigrationFeed } from "@/components/MigrationFeed";
import { TokenTable } from "@/components/TokenTable";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useNewTokensLive } from "@/hooks/useNewTokensLive";
import { Search, Heart, Settings, Wallet, ExternalLink, TrendingUp, Moon, Sun, BarChart3, Loader2, X, Activity, Timer, Target, TrendingDown, RefreshCw, ExternalLinkIcon, Star } from "lucide-react";
import { SiX, SiSolana } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [riskAnalysis, setRiskAnalysis] = useState<Record<string, any>>({});
  const [analyzingTokens, setAnalyzingTokens] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    riskLevel: "",
    timeRange: "",
    minMarketCap: "",
    maxMarketCap: "",
    sortBy: "marketCap",
    sortOrder: "desc" as "asc" | "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const tokensPerPage = 20;

  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { toggleFavorite, isFavorite, toggleCategorizedFavorite } = useFavorites();

  // Get live new tokens data
  const { 
    tokens: liveTokens, 
    totalTokens, 
    tokensPerHour, 
    isLoading: isLoadingLiveTokens, 
    error: liveTokensError,
    lastUpdated 
  } = useNewTokensLive();

  // Wallet connection
  const { connected, publicKey, connect, disconnect, isPhantomInstalled } = usePhantomWallet();

  // Solana network stats
  const { data: solanaNetworkStats } = useQuery({
    queryKey: ['solanaNetworkStats'],
    queryFn: async () => {
      const response = await fetch('/api/solana/network-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch network stats');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000,
    retry: 3,
    retryDelay: 1000,
  });

  // Migration feed data
  const { 
    data: migrationData, 
    isLoading: isLoadingMigrations, 
    error: migrationError,
    refetch: refetchMigrations 
  } = useQuery({
    queryKey: ['migrationFeed'],
    queryFn: async () => {
      const response = await fetch('/api/migrations');
      if (!response.ok) {
        throw new Error('Failed to fetch migration data');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    staleTime: 5000,
    retry: 3,
    retryDelay: 2000,
  });

  // Trending tokens data
  const { 
    data: trendingData, 
    isLoading: isLoadingTrending, 
    error: trendingError,
    refetch: refetchTrending 
  } = useQuery({
    queryKey: ['trendingTokens'],
    queryFn: async () => {
      const response = await fetch('/api/tokens/trending');
      if (!response.ok) {
        throw new Error('Failed to fetch trending data');
      }
      return response.json();
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 10000,
    retry: 3,
    retryDelay: 2000,
  });

  // All tokens data for search and filtering
  const { 
    data: allTokensData, 
    isLoading: isLoadingAllTokens, 
    error: allTokensError,
    refetch: refetchTokens 
  } = useQuery({
    queryKey: ['allTokens', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.minMarketCap) params.append('minMarketCap', filters.minMarketCap);
      if (filters.maxMarketCap) params.append('maxMarketCap', filters.maxMarketCap);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const response = await fetch(`/api/tokens?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      return response.json();
    },
    refetchInterval: 3000, // More frequent updates for real-time feel
  });

  // Remove WebSocket connection - we're using API polling instead
  // const { connectionStatus, lastMessage } = useWebSocket("/ws");

  // Remove WebSocket message handling - using API polling instead
  // useEffect(() => {
  //   if (lastMessage?.type === 'migration' || 
  //       lastMessage?.type === 'tokenUpdate' || 
  //       lastMessage?.type === 'newToken') {
  //     refetchTokens();
  //   }
  // }, [lastMessage, refetchTokens]);

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    setSearchResult(null);
    setSearchError("");
    
    // If search query is empty, clear search results
    if (!value.trim()) {
      return;
    }
    
    const searchTerm = value.trim();
    
    // Check if this looks like a Solana address (32-44 characters, base58)
    const isSolanaAddress = searchTerm.length >= 32 && searchTerm.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(searchTerm);
    
    if (isSolanaAddress) {
      // Search for SPL token by address
      setIsSearching(true);
      try {
        const response = await fetch(`/api/tokens/search/${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResult(data);
          const sourceText = data.source === 'database' ? 'Database' : 
                           data.source === 'blockchain' ? 'Blockchain Analysis' : 
                           data.source === 'pump_portal' ? 'Pump.fun Live' : 'Live Analysis';
          toast({
            title: "SPL Token Found",
            description: `Found ${data.token.name} (${data.token.symbol}) - ${sourceText}`,
          });
        } else {
          const error = await response.json();
          setSearchError(error.error || "Token not found on Solana blockchain");
          toast({
            title: "Token Not Found",
            description: "Could not find this token address on the Solana blockchain. Please verify the address is correct.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setSearchError("Failed to search for token");
        toast({
          title: "Search Error",
          description: "Failed to search for token. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    } else if (searchTerm.length >= 2) {
      // Use existing database search for names/symbols
      // This searches the existing tracked tokens
      setIsSearching(true);
      try {
        // Just update the searchQuery to trigger existing token filtering
        setSearchQuery(searchTerm);
        toast({
          title: "Searching Database",
          description: `Filtering tracked tokens for "${searchTerm}"`,
        });
      } catch (error) {
        setSearchError("Failed to search for token");
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
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
            <div className="flex items-center space-x-4" style={{ width: 'calc(25% - 1rem)' }}>
              {/* Logo - Memeter logo SVG - Aligned with end of blue rectangle */}
              <div className="relative w-32 h-32 ml-auto">
                <img 
                  src="/memeter-logo.svg" 
                  alt="Memeter Logo" 
                  className="w-full h-full object-contain"
                />
                </div>
              <div className="flex items-center space-x-1 ml-auto">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground" data-testid="connection-status">
                    Live
                  </span>
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
                  data-testid="input-search"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              {/* Live Solana Price */}
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-2xl text-white transform -skew-x-6 drop-shadow-lg animate-pulse hover:scale-105 transition-transform duration-300">◎</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">
                    ${solanaNetworkStats?.price ? solanaNetworkStats.price.toFixed(2) : '---'}
                  </span>
                  {solanaNetworkStats?.percentChange24h !== undefined && (
                    <span className={`text-xs font-medium ${solanaNetworkStats.percentChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {solanaNetworkStats.percentChange24h >= 0 ? '+' : ''}{solanaNetworkStats.percentChange24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              
              <Button 
                variant="secondary" 
                size="sm" 
                asChild 
                data-testid="button-favorites"
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
                data-testid="button-wallet"
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
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/20 hover:shadow-blue-500/25"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                ) : (
                  <Moon className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                )}
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
                  <p className="text-3xl font-bold text-green-600">
                    {migrationData?.migrations?.length || 0}
                  </p>
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
                  <p className="text-sm font-medium text-muted-foreground">Tokens Ready to Migrate Today</p>
                  <p className="text-3xl font-bold text-purple-600">1,247</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <BarChart3 className="inline h-3 w-3 mr-1" />
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
                  <p className="text-3xl font-bold text-orange-600">
                    {trendingData?.trending?.length || 0}
                  </p>
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
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[1200px] max-h-[1000px] overflow-y-auto space-y-3">
              {isLoadingLiveTokens ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading live tokens...</span>
                </div>
              ) : liveTokensError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to load live tokens</p>
                  <p className="text-sm">{liveTokensError}</p>
                </div>
              ) : liveTokens.length > 0 ? (
                liveTokens.slice(0, 30).map((token, index) => (
                  <div key={token.mint} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {token.image ? (
                            <img 
                              src={token.image} 
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span className={token.image ? 'hidden' : ''}>{token.symbol.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{token.name}</div>
                          <div className="text-xs text-muted-foreground">{token.symbol}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">${(token.marketCapSol ? token.marketCapSol * 150 : token.marketCap || 0).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {token.pool === 'pump' ? (
                              <a 
                                href={`https://pump.fun/${token.mint}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-400 transition-colors"
                              >
                                pump.fun
                              </a>
                            ) : token.pool === 'bonk' ? (
                              <a 
                                href={`https://bonk.fun/${token.mint}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-400 transition-colors"
                              >
                                bonk.fun
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <a 
                            href={`https://solscan.io/token/${token.mint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View on Solscan"
                          >
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const favoriteToken = {
                                mint: token.mint,
                                category: 'new' as const, // Explicitly set category
                                name: token.name,
                                symbol: token.symbol,
                                image: token.image,
                                marketCap: token.marketCapSol ? token.marketCapSol * 150 : token.marketCap,
                                pool: token.pool
                              };
                              toggleCategorizedFavorite(favoriteToken); // Use new categorized toggle
                              toast({
                                title: isFavorite(token.mint) ? "Removed from Favorites" : "Added to Favorites",
                                description: `${token.symbol} ${isFavorite(token.mint) ? 'removed from' : 'added to'} your favorites`,
                              });
                            }}
                            className={`h-6 w-6 p-0 transition-all duration-200 flex items-center justify-center ${
                              isFavorite(token.mint)
                                ? 'bg-orange-500/10 hover:bg-orange-500/20 hover:shadow-lg hover:shadow-orange-500/25'
                                : 'hover:bg-orange-500/10 hover:shadow-md hover:shadow-orange-500/15'
                            }`}
                            title={isFavorite(token.mint) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star 
                              className={`h-3 w-3 transition-all duration-200 ${
                                isFavorite(token.mint) 
                                  ? 'fill-orange-500 text-orange-500 drop-shadow-sm' 
                                  : 'text-muted-foreground hover:text-orange-500 hover:drop-shadow-sm'
                              }`} 
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No new tokens found</p>
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
                onClick={() => refetchMigrations()}
                className="h-8 w-8 p-0 hover:bg-orange-500/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[1200px] max-h-[1000px] overflow-y-auto space-y-3">
              {isLoadingMigrations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading migrations...</span>
                </div>
              ) : migrationError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to load migrations</p>
                  <p className="text-sm">{migrationError.message}</p>
                </div>
              ) : migrationData?.migrations?.length > 0 ? (
                migrationData.migrations.slice(0, 30).map((migration: any, index: number) => (
                  <div key={index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {migration.symbol?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{migration.name || 'Migrated Token'}</div>
                          <div className="text-xs text-muted-foreground">{migration.symbol || 'MIGRATED'}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">Migrated</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(migration.timestamp || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent migrations</p>
                </div>
              )}
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
                onClick={() => refetchTrending()}
                className="h-8 w-8 p-0 hover:bg-orange-500/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-card/50 border border-border/20 rounded-lg p-4 min-h-[1200px] max-h-[1000px] overflow-y-auto space-y-3">
              {isLoadingTrending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading trending tokens...</span>
                </div>
              ) : trendingError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to load trending tokens</p>
                  <p className="text-sm">{trendingError.message}</p>
                </div>
              ) : trendingData?.trending?.length > 0 ? (
                trendingData.trending.slice(0, 30).map((token: any, index: number) => (
                  <div key={index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                          {token.symbol?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{token.name || 'Trending Token'}</div>
                          <div className="text-xs text-muted-foreground">{token.symbol || 'TREND'}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">+{Math.floor(Math.random() * 100)}%</div>
                        <div className="text-xs text-muted-foreground">24h</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No trending tokens</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}