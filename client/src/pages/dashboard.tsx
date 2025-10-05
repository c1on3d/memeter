import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MigrationFeed } from "@/components/MigrationFeed";
import { TokenTable } from "@/components/TokenTable";
import { useWebSocket } from "@/hooks/useWebSocket";
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
    hasocialLinks: false,
    highVolume: false,
    verifiedCreator: false,
    minHolders: "",
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Fixed page size of 20 tokens per page
  
  const { publicKey, connected, connect, disconnect, isPhantomInstalled } = usePhantomWallet();
  const { toast } = useToast();
  const newTokensLiveData = useNewTokensLive();
  const { theme, toggleTheme } = useTheme();
  const { toggleFavorite, isFavorite, toggleCategorizedFavorite } = useFavorites();

  // Authentication protection removed - allow direct dashboard access
  // useEffect(() => {
  //   if (!connected || !publicKey) {
  //     setLocation('/');
  //   }
  // }, [connected, publicKey, setLocation]);

  // Generate risk analysis for a token
  const generateRiskAnalysis = async (token: any) => {
    if (analyzingTokens.has(token.id)) return; // Prevent duplicate requests
    
    try {
      setAnalyzingTokens(prev => new Set([...Array.from(prev), token.id]));
      
      let analysisResult;
      
      // Check if this is a trending token from DexScreener (has pairAddress and price)
      if (token.pairAddress && token.price !== undefined) {
        // For trending tokens, create analysis using a special endpoint that accepts token data
        const response = await fetch(`/api/tokens/analyze-external`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: token.name,
            symbol: token.symbol,
            address: token.pairAddress,
            price: token.price,
            marketCap: token.marketCap,
            volume24h: token.volume24h,
            priceChange24h: token.priceChange24h,
            chainId: token.chainId || 'solana'
          })
        });

        if (!response.ok) {
          throw new Error(`External analysis failed: ${response.status}`);
        }
        
        analysisResult = await response.json();
      } else {
        // For database tokens, use the existing endpoint
        const tokenAddress = token.address || token.id;
        const response = await fetch(`/api/tokens/${tokenAddress}/analysis`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.status}`);
        }

        analysisResult = await response.json();
      }

      setRiskAnalysis(prev => ({
        ...prev,
        [token.id]: analysisResult
      }));

      toast({
        title: "Risk Analysis Complete",
        description: `Generated analysis for ${token.symbol}`,
      });

    } catch (error) {
      console.error('Risk analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate risk analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingTokens(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(token.id);
        return newSet;
      });
    }
  };



  // Get real Solana network statistics for live price
  const { data: solanaNetworkStats } = useQuery<{
    volume24h: number;
    formattedVolume24h: string;
    marketCap: number;
    formattedMarketCap: string;
    price: number;
    percentChange24h: number;
  }>({
    queryKey: ["/api/analytics/solana-network"],
    refetchInterval: 5 * 1000, // Update every 5 seconds for live pricing
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on component mount
  });

  // Analytics queries for the top panels
  const { data: tokensReadyData } = useQuery<{
    tokensReadyToMigrate: number;
    tokensNearThreshold: number;
    thresholdUSD: number;
    thresholdSOL: number;
    qualifiedTokens: any[];
    source: string;
  }>({
    queryKey: ["/api/analytics/tokens-ready-to-migrate"],
    refetchInterval: 10000,
  });

  const { data: recentTokensData } = useQuery<{
    recentTokens: number;
  }>({
    queryKey: ["/api/analytics/recent-tokens"],
    refetchInterval: 3000,
  });

  const { data: totalTokensData } = useQuery<{
    totalTokens: number;
  }>({
    queryKey: ["/api/analytics/total-tokens"],
    refetchInterval: 5000,
  });

  const { data: migrationThresholdData } = useQuery<{
    thresholdSOL: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    sampleSize: number;
    source: string;
  }>({
    queryKey: ["/api/analytics/migration-threshold"],
    refetchInterval: 10000,
  });

  // Analytics calculations
  const recentTokens = recentTokensData?.recentTokens || 0;
  const totalTokens = totalTokensData?.totalTokens || 0;
  const tokensPerHour = Math.round(recentTokens / 6);
  const currentThresholdSOL = migrationThresholdData?.thresholdSOL || 85;
  const migrationThresholdUSD = solanaNetworkStats?.price ? (currentThresholdSOL * solanaNetworkStats.price) : null;

  const { data: tokensData, refetch: refetchTokens } = useQuery<{ tokens: any[]; page: number; limit: number; total: number }>({
    queryKey: ["/api/tokens", { 
      search: searchQuery || undefined,
      riskLevel: filters.riskLevel || undefined,
      page: currentPage,
      limit: pageSize,
    }],
    refetchInterval: 3000, // More frequent updates for real-time feel
  });

  const { connectionStatus, lastMessage } = useWebSocket("/ws");

  useEffect(() => {
    if (lastMessage?.type === 'migration' || 
        lastMessage?.type === 'tokenUpdate' || 
        lastMessage?.type === 'newToken') {
      refetchTokens();
    }
  }, [lastMessage, refetchTokens]);


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
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-muted-foreground" data-testid="connection-status">
                    {connectionStatus === 'connected' ? 'Live' : 'Disconnected'}
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
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/20 hover:shadow-yellow-500/25"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-12" />
                ) : (
                  <Sun className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-45" />
                )}
              </Button>

              <Button 
                variant="secondary" 
                size="sm" 
                asChild
                data-testid="button-twitter"
                title="Follow us on X/Twitter"
                className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-black/10 hover:text-black dark:hover:bg-white/10 dark:hover:text-white hover:border-gray-500/20"
              >
                <a
                  href="https://x.com/Memeterdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiX className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-6" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Content */}
          <main className="space-y-6">

            {/* Search Results */}
            {searchResult && (
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Search Result</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchResult(null);
                      setSearchQuery("");
                    }}
                    data-testid="button-clear-search"
                  >
                    Clear Search
                  </Button>
                </div>
                <TokenTable 
                  tokens={[searchResult.token]}
                  searchQuery=""
                  filters={{}}
                  onRefresh={() => {}}
                  onFiltersChange={() => {}}
                />
                <div className="mt-3 text-sm text-muted-foreground">
                  Found from: <span className="font-medium">{searchResult.source === 'blockchain' ? 'Solana Blockchain' : 'Database'}</span>
                </div>
              </div>
            )}

            {/* Search Error */}
            {searchError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-destructive"></div>
                  <span className="font-medium text-destructive">Search Error</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{searchError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setSearchError("")}
                >
                  Dismiss
                </Button>
              </div>
            )}





            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
              {/* New Tokens Created */}
              <div className="space-y-6">
                <Card className="min-h-[1200px]">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>New Tokens Created</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-muted-foreground">
                          {newTokensLiveData.tokensPerHour}/hr
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="hover:bg-muted/50"
                          title="Refresh New Tokens"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {newTokensLiveData.isLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-[1000px] overflow-y-auto">
                          {newTokensLiveData.tokens.map((token, i) => (
                            <div key={token.mint} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                                {token.image ? (
                                  <img 
                                    src={token.image} 
                                    alt={`${token.name} logo`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to letter display if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.className = 'w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold';
                                        parent.textContent = token.symbol.charAt(0).toUpperCase();
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                    {token.symbol.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{token.name}</p>
                                <p className="text-xs text-muted-foreground">${token.symbol}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <a 
                                    href={`https://solscan.io/token/${token.mint}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-400 flex items-center"
                                  >
                                    <ExternalLinkIcon className="h-3 w-3 mr-1" />
                                    Solscan
                                  </a>
                                  {token.pool === 'pump' && (
                                    <a 
                                      href={`https://pump.fun/${token.mint}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-500 hover:text-green-400 flex items-center"
                                    >
                                      <ExternalLinkIcon className="h-3 w-3 mr-1" />
                                      pump.fun
                                    </a>
                                  )}
                                  {token.pool === 'bonk' && (
                                    <a 
                                      href={`https://bonk.fun/${token.mint}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-orange-500 hover:text-orange-400 flex items-center"
                                    >
                                      <ExternalLinkIcon className="h-3 w-3 mr-1" />
                                      bonk.fun
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-end space-x-2 min-w-[80px]">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const favoriteToken = {
                                      mint: token.mint,
                                      category: 'new' as const,
                                      name: token.name,
                                      symbol: token.symbol,
                                      image: token.image,
                                      marketCap: token.marketCapSol ? token.marketCapSol * 150 : token.marketCap,
                                      pool: token.pool
                                    };
                                    toggleCategorizedFavorite(favoriteToken);
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
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-xs ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {token.marketCapSol ? `$${(token.marketCapSol * 150).toLocaleString()}` : `$${token.marketCap.toLocaleString()}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Total Created: {newTokensLiveData.totalTokens.toLocaleString()}</span>
                            <span>
                              {newTokensLiveData.lastUpdated && 
                                `Updated ${Math.floor((Date.now() - newTokensLiveData.lastUpdated.getTime()) / 1000)}s ago`
                              }
                            </span>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full mt-4">
                          View All New Tokens
                        </Button>
              </>
            )}
                  </CardContent>
                </Card>
              </div>

              {/* Recently Migrated */}
              <div className="space-y-6">
                <Card className="min-h-[1200px]">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>Recently Migrated</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="hover:bg-muted/50"
                          title="Refresh Migrations"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[1000px] overflow-y-auto">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                            {String.fromCharCode(65 + (i % 26))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">Migrated Token {i + 1}</p>
                            <p className="text-xs text-muted-foreground">$MTK{i + 1}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-orange-500">{Math.floor(Math.random() * 50)}%</p>
                            <p className="text-xs text-muted-foreground">Migrated</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Migrations
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Trending Tokens */}
              <div className="space-y-6">
                <Card className="min-h-[1200px]">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>Trending Tokens</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="hover:bg-muted/50"
                          title="Refresh Trending"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[1000px] overflow-y-auto">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                            {String.fromCharCode(65 + (i % 26))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">Trending Token {i + 1}</p>
                            <p className="text-xs text-muted-foreground">$TTK{i + 1}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-purple-500">#{i + 1}</p>
                            <p className="text-xs text-muted-foreground">Trending</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Trending
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
