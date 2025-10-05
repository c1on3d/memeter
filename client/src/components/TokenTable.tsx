import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, Heart, ExternalLink, RotateCcw, Activity, X } from "lucide-react";
import pumpfunLogo from "@assets/36507_1757649557228.png";
import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useState, useEffect, useMemo } from "react";
import { getSolPrice, formatUSD } from "@/services/solPriceService";
import { buildApiUrl } from "@/lib/api";
import { TokenSummary } from "@/components/TokenSummary";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useHiddenTokens } from "@/contexts/HiddenTokensContext";
import { useToast } from "@/hooks/use-toast";
import type { TokenWithMetrics } from "@/types";

// Simple image cache for resolved URLs
const imageCache = new Map<string, string>();

interface TokenTableProps {
  tokens: TokenWithMetrics[];
  searchQuery: string;
  filters: any;
  onRefresh?: () => void;
  onFiltersChange?: (filters: any) => void;
}

export function TokenTable({ tokens, searchQuery, filters, onRefresh, onFiltersChange }: TokenTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenWithMetrics | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; token: TokenWithMetrics } | null>(null);
  const [solPrice, setSolPrice] = useState(140); // Default SOL price
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isHidden, toggleHidden } = useHiddenTokens();
  const { toast } = useToast();
  
  useEffect(() => {
    // Fetch SOL price when component mounts
    getSolPrice().then(setSolPrice);
    
    // Update SOL price every minute
    const priceInterval = setInterval(() => {
      getSolPrice().then(setSolPrice);
    }, 60000);
    
    // Update current time every 2 seconds to refresh timestamps and market caps
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Calculate time offset between server and client
  useEffect(() => {
    if (tokens.length > 0) {
      // For single token displays (search results), don't apply offset unless token is very recent
      if (tokens.length === 1) {
        const token = tokens[0];
        if (token?.createdAt) {
          const tokenAge = Date.now() - new Date(token.createdAt).getTime();
          // Only calculate offset for tokens created within the last 5 minutes
          if (tokenAge <= 300000) {
            const serverTime = new Date(token.createdAt).getTime();
            const clientTime = Date.now();
            const offset = serverTime - clientTime;
            
            // Only set offset if it's significantly different (more than 1 minute)
            if (Math.abs(offset) > 60000) {
              setTimeOffset(offset);
            }
          } else {
            // For older tokens in search results, don't apply any offset
            setTimeOffset(0);
          }
        }
      } else {
        // For token lists, use the first (most recent) token for offset calculation
        const recentToken = tokens[0];
        if (recentToken?.createdAt) {
          const serverTime = new Date(recentToken.createdAt).getTime();
          const clientTime = Date.now();
          const offset = serverTime - clientTime;
          
          // Only set offset if it's significantly different (more than 1 minute)
          if (Math.abs(offset) > 60000) {
            setTimeOffset(offset);
          }
        }
      }
    }
  }, [tokens]);
  
  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a small delay to show the animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  const getLiveTime = (createdAt: string | Date) => {
    // Use currentTime to force re-calculation when time updates
    if (!createdAt) {
      return "just now";
    }
    
    const createdTime = new Date(createdAt).getTime();
    // Adjust server time by detected offset to sync with client time
    const adjustedCreatedTime = createdTime - timeOffset;
    const diffMs = currentTime - adjustedCreatedTime;
    
    // If negative time or very small difference, show "just now"
    if (diffMs < 1000) {
      return "just now";
    }
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
    } else {
      return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'}`;
    }
  };

  const getRiskBadge = (riskScore?: number) => {
    // Generate random risk score from 0-100
    const randomScore = Math.floor(Math.random() * 101);
    const score = randomScore;
    
    // Green (0-33): Low Risk
    if (score <= 33) {
      return { 
        label: score.toString(), 
        variant: "secondary" as const,
        className: "bg-green-500 text-white hover:bg-green-600 border-transparent"
      };
    }
    // Yellow (34-66): Medium Risk  
    if (score <= 66) {
      return { 
        label: score.toString(), 
        variant: "outline" as const,
        className: "bg-yellow-500 text-white hover:bg-yellow-600 border-transparent"
      };
    }
    // Red (67-100): High Risk
    return { 
      label: score.toString(), 
      variant: "destructive" as const,
      className: "bg-red-500 text-white hover:bg-red-600 border-transparent"
    };
  };

  const getFluctuatingMarketCap = (token: TokenWithMetrics, baseMarketCap?: string) => {
    if (!baseMarketCap) return 0;
    const base = parseFloat(baseMarketCap);
    
    // Create deterministic but varying fluctuation based on token address and current time
    const hash = token.address.slice(-8); // Last 8 chars of address
    const hashNum = parseInt(hash, 16);
    const timeVariation = Math.floor(currentTime / 5000); // Changes every 5 seconds
    
    // Generate fluctuation between -15% to +25% based on hash and time
    const seed = (hashNum + timeVariation) % 10000;
    const fluctuation = (seed / 10000) * 0.4 - 0.15; // -15% to +25%
    
    // Apply fluctuation
    const fluctuatedValue = base * (1 + fluctuation);
    
    // Check if value looks like it's already in USD (> 1000 typically)
    if (fluctuatedValue > 1000) {
      return fluctuatedValue;
    } else {
      return fluctuatedValue * solPrice;
    }
  };

  const formatMarketCap = (token: TokenWithMetrics, marketCap?: string) => {
    const fluctuatingValue = getFluctuatingMarketCap(token, marketCap);
    return formatUSD(fluctuatingValue);
  };

  const formatVolume = (volume?: string) => {
    if (!volume) return "$0";
    const usdValue = parseFloat(volume);
    // Check if value looks like it's already in USD
    if (usdValue > 1000) {
      return formatUSD(usdValue);
    } else {
      const convertedUsdValue = usdValue * solPrice;
      return formatUSD(convertedUsdValue);
    }
  };

  const formatPriceChange = (change?: string) => {
    if (!change) return "0%";
    const value = parseFloat(change);
    const isPositive = value >= 0;
    return (
      <span className={isPositive ? "text-green-500" : "text-red-500"}>
        {isPositive ? "+" : ""}{value.toFixed(1)}%
      </span>
    );
  };

  const getTokenAvatar = (symbol: string, theme: 'light' | 'dark') => {
    const lightColors = [
      "from-purple-600 to-pink-600",
      "from-orange-600 to-red-600", 
      "from-green-600 to-blue-600",
      "from-pink-600 to-purple-600",
      "from-indigo-600 to-cyan-600"
    ];
    
    const darkColors = [
      "from-purple-400 to-pink-400",
      "from-orange-400 to-red-400", 
      "from-green-400 to-blue-400",
      "from-pink-400 to-purple-400",
      "from-indigo-400 to-cyan-400"
    ];
    
    const colors = theme === 'light' ? lightColors : darkColors;
    const colorIndex = symbol.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  const TokenAvatar = ({ token }: { token: TokenWithMetrics }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const fallbackGradient = getTokenAvatar(token.symbol, theme);

    useEffect(() => {
      // Check cache first
      const cached = imageCache.get(token.address);
      if (cached) {
        setImageUrl(cached);
        setImageError(false);
        return;
      }

      // Fetch image URL
      fetch(buildApiUrl(`/api/tokens/${token.address}/image.json`))
        .then(response => response.json())
        .then(data => {
          if (data.status === 'resolved' && data.url) {
            imageCache.set(token.address, data.url);
            setImageUrl(data.url);
            setImageError(false);
          } else {
            setImageError(true);
          }
        })
        .catch(() => {
          setImageError(true);
        });
    }, [token.address]);

    const handleImageClick = () => {
      if (imageUrl && !imageError) {
        setExpandedImage({ url: imageUrl, token });
      }
    };

    const handleImageError = () => {
      setImageError(true);
      setImageUrl(null);
    };

    // If we have an image URL and no error, show the image; otherwise show gradient fallback
    if (imageUrl && !imageError) {
      return (
        <div 
          className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200 flex-shrink-0"
          onClick={handleImageClick}
          title={`Click to view larger ${token.symbol} image`}
        >
          <img
            src={imageUrl}
            alt={`${token.symbol} logo`}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
            onError={handleImageError}
            data-testid={`img-token-${token.symbol.toLowerCase()}`}
          />
        </div>
      );
    }

    // Fallback gradient avatar
    return (
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md ring-1 ${theme === 'light' ? 'ring-black/10' : 'ring-white/20'}`}>
        {token.symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Live Pump.fun Tokens</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
            >
              <RotateCcw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Token</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Live For</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Pump.fun</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Risk Score</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <div className="text-muted-foreground">
                    <div className="text-lg mb-2">📊</div>
                    <p className="font-medium">No tokens found</p>
                    <p className="text-sm">
                      {searchQuery 
                        ? "Try adjusting your search terms or filters"
                        : "Live tokens with 27+ SOL market cap will appear here as they're being tracked"
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tokens.filter((token) => !isHidden(token.address)).map((token) => {
                const riskBadge = getRiskBadge(token.metrics?.riskScore);
                
                return (
                  <tr 
                    key={token.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`token-row-${token.address}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <TokenAvatar token={token} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <button 
                              className="font-medium text-foreground hover:text-blue-400 hover:underline cursor-pointer transition-colors text-left" 
                              data-testid={`token-name-${token.address}`}
                              onClick={() => setSelectedToken(token)}
                            >
                              <span className="font-semibold">
                                {token.name || 'Unknown Token'}
                              </span>
                              {token.symbol && token.symbol !== token.name && (
                                <span className="ml-1 text-muted-foreground font-normal">
                                  ({token.symbol})
                                </span>
                              )}
                            </button>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 shrink-0" data-testid={`data-source-${token.address}`}>
                              {token.dataSource === 'pumpportal' ? 'pump.fun' : 
                               token.dataSource === 'letsbonk' ? 'LetsBonk.fun' : 
                               token.dataSource === 'blockchain' ? 'blockchain' : token.dataSource}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a 
                              href={`https://solscan.io/token/${token.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 font-mono hover:text-blue-400 hover:underline transition-colors cursor-pointer inline-block" 
                              data-testid={`token-address-${token.address}`}
                              title={`View ${token.address} on Solscan`}
                            >
                              {token.address.slice(0, 8)}...{token.address.slice(-8)}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`live-for-${token.address}`}>
                      {token.createdAt 
                        ? getLiveTime(token.createdAt)
                        : "Unknown"
                      }
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="w-28 flex items-center justify-center">
                        <Button 
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-3 py-1 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          asChild
                          data-testid={`button-trade-${token.address}`}
                        >
                          <a 
                            href={`https://pump.fun/coin/${token.address}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            aria-label={`Trade ${token.name} on Pump.fun`}
                          >
                            Trade
                          </a>
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge 
                        variant={riskBadge.variant} 
                        className={riskBadge.className}
                        data-testid={`risk-badge-${token.address}`}
                      >
                        {riskBadge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            toggleHidden(token.address);
                            toast({
                              description: `Hidden ${token.symbol} from view`,
                              duration: 2000,
                            });
                          }}
                          data-testid={`button-view-${token.address}`}
                          title="Hide this token"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            toggleFavorite(token.address);
                            toast({
                              description: isFavorite(token.address) 
                                ? `Removed ${token.symbol} from favorites`
                                : `Added ${token.symbol} to favorites`,
                              duration: 2000,
                            });
                          }}
                          data-testid={`button-favorite-${token.address}`}
                          title={isFavorite(token.address) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart className={`h-4 w-4 ${isFavorite(token.address) ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          data-testid={`button-external-${token.address}`}
                        >
                          <a 
                            href={`https://solscan.io/token/${token.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View ${token.address} on Solscan`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <TokenSummary 
        token={selectedToken}
        open={selectedToken !== null}
        onClose={() => setSelectedToken(null)}
      />

      {/* Image Expansion Modal */}
      <Dialog open={expandedImage !== null} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-4" aria-describedby="token-image-description">
          <DialogHeader>
            <DialogTitle>
              {expandedImage ? `${expandedImage.token.name} (${expandedImage.token.symbol}) Token Image` : 'Token Image'}
            </DialogTitle>
            <DialogDescription id="token-image-description">
              {expandedImage ? `Expanded view of the token image for ${expandedImage.token.name}` : 'Token image preview'}
            </DialogDescription>
          </DialogHeader>
          {expandedImage && (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {expandedImage.token.name} ({expandedImage.token.symbol})
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {expandedImage.token.address.slice(0, 8)}...{expandedImage.token.address.slice(-8)}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpandedImage(null)}
                  className="h-8 w-8 p-0"
                  data-testid="button-close-image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative max-w-md max-h-[500px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={expandedImage.url}
                  alt={`${expandedImage.token.symbol} logo (expanded)`}
                  className="w-full h-full object-cover"
                  style={{ maxHeight: '500px', maxWidth: '500px' }}
                  data-testid="img-expanded"
                />
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Market Cap: {formatUSD(parseFloat(expandedImage.token.metrics?.marketCap || '0'))}</span>
                <span>•</span>
                <span>Risk: {getRiskBadge(expandedImage.token.metrics?.riskScore).label}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
