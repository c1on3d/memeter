import { Link, useLocation } from "wouter";
import { Star, ArrowLeft, ExternalLinkIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites, type FavoriteToken } from "@/contexts/FavoritesContext";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { buildApiUrl } from "@/lib/api";
import type { TokenWithMetrics } from "@/types";

export default function Favorites() {
  const [, setLocation] = useLocation();
  const { favorites, categorizedFavorites, toggleCategorizedFavorite, isFavorite } = useFavorites();
  const { theme } = useTheme();
  const { connected, publicKey } = usePhantomWallet();
  const { toast } = useToast();

  // Authentication protection removed - allow direct favorites access
  // useEffect(() => {
  //   if (!connected || !publicKey) {
  //     setLocation('/');
  //   }
  // }, [connected, publicKey, setLocation]);

  // Filter categorized favorites by category
  const newTokensFavorites = categorizedFavorites.filter(token => token.category === 'new');
  const migratedTokensFavorites = categorizedFavorites.filter(token => token.category === 'migrated');
  const trendingTokensFavorites = categorizedFavorites.filter(token => token.category === 'trending');

  // Helper function to proxy images via backend
  const getProxiedImageUrl = (imageUrl?: string | null): string | null => {
    if (!imageUrl) return null;
    const base = buildApiUrl("").replace(/\/+$/, "");

    if (imageUrl.endsWith('.json')) return null;
    if (/^\/api\/image-proxy\?url=/.test(imageUrl)) return `${base}${imageUrl}`;
    if (imageUrl.startsWith(`${base}/api/image-proxy`)) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return `${base}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }
    return null;
  };

  const TokenImage = ({ symbol, image }: { symbol?: string | null, image?: string | null }) => {
    const src = getProxiedImageUrl(image);
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className={`relative w-10 h-10 flex-shrink-0 ${src ? 'cursor-zoom-in ring-2 ring-white/70 hover:ring-white transition-shadow rounded-full' : ''}`} title={src ? 'Click to enlarge' : undefined}>
            {src && (
              <img
                src={src}
                alt={symbol || 'Token'}
                className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {symbol?.charAt(0)?.toUpperCase() || 'T'}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] bg-background p-0 border-0 shadow-xl">
          {src && (
            <img src={src} alt={symbol || 'Token'} className="max-h-[80vh] w-auto rounded-xl mx-auto" />
          )}
        </DialogContent>
      </Dialog>
    );
  };

  const renderTokenCard = (token: FavoriteToken) => (
    <div key={token.mint} className="flex items-center space-x-3 p-3 bg-card/50 border border-border/20 rounded-lg hover:bg-card/70 transition-colors">
      <TokenImage symbol={token.symbol} image={token.image} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-medium text-sm">
          <span className="truncate max-w-[16rem]" title={token.name || token.symbol}>{token.name || token.symbol}</span>
          <button
            type="button"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(token.mint || '');
                toast({ title: 'Copied', description: 'Mint address copied to clipboard' });
              } catch {}
            }}
            title="Copy mint address"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{token.symbol}</span>
          {token.pool && (
            <a
              href={token.pool === 'pump' ? `https://pump.fun/${token.mint}` : token.pool === 'bonk' ? `https://bonk.fun/${token.mint}` : `https://solscan.io/token/${token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs px-1.5 py-0.5 rounded hover:underline ${token.pool === 'pump' ? 'text-green-500' : token.pool === 'bonk' ? 'text-orange-500' : 'text-blue-500'}`}
              title={`View on ${token.pool === 'pump' ? 'Pump.fun' : token.pool === 'bonk' ? 'Bonk.fun' : 'Solscan'}`}
            >
              {token.pool === 'pump' ? 'pump.fun' : token.pool === 'bonk' ? 'bonk.fun' : 'solscan'}
            </a>
          )}
        </div>
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
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {token.marketCap ? `$${token.marketCap.toLocaleString()}` : 'N/A'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toggleCategorizedFavorite(token);
            toast({
              title: isFavorite(token.mint) ? "Removed from Favorites" : "Added to Favorites",
              description: `${token.symbol} ${isFavorite(token.mint) ? 'removed from' : 'added to'} your favorites`,
            });
          }}
          className={`h-6 w-6 p-0 transition-all duration-200 ${
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
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-black border-b border-border/20 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="button-back" className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-gray-800/50 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                <Star className="h-6 w-6 text-orange-500 fill-orange-500 drop-shadow-sm" />
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, monospace' }}>My Favorites</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <main className="space-y-8">
            {categorizedFavorites.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 border-border/20">
                <div className="flex flex-col items-center space-y-4">
                  <Star className="h-16 w-16 text-orange-500/50 fill-orange-500/20 drop-shadow-sm" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>No Favorites Yet</h2>
                    <p className="text-muted-foreground max-w-md">
                      You haven't favorited any tokens yet. Head back to the dashboard and click the star icon on tokens you'd like to save here.
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <Button data-testid="button-browse-tokens" className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/20">
                      Browse Tokens
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Tokens Created */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>
                      New Tokens Created
                    </h2>
                    <span className="text-xs text-muted-foreground bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full">
                      {newTokensFavorites.length}
                    </span>
                  </div>
                  <Card className="p-4 bg-card/50 border-border/20 min-h-[400px]">
                    {newTokensFavorites.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <Star className="h-8 w-8 text-orange-500/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No new tokens favorited</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {newTokensFavorites.map(renderTokenCard)}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Recently Migrated */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>
                      Recently Migrated
                    </h2>
                    <span className="text-xs text-muted-foreground bg-purple-500/10 text-purple-500 px-2 py-1 rounded-full">
                      {migratedTokensFavorites.length}
                    </span>
                  </div>
                  <Card className="p-4 bg-card/50 border-border/20 min-h-[400px]">
                    {migratedTokensFavorites.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <Star className="h-8 w-8 text-purple-500/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No migrated tokens favorited</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {migratedTokensFavorites.map(renderTokenCard)}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Trending Tokens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Orbitron, monospace' }}>
                      Trending Tokens
                    </h2>
                    <span className="text-xs text-muted-foreground bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                      {trendingTokensFavorites.length}
                    </span>
                  </div>
                  <Card className="p-4 bg-card/50 border-border/20 min-h-[400px]">
                    {trendingTokensFavorites.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <Star className="h-8 w-8 text-green-500/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No trending tokens favorited</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {trendingTokensFavorites.map(renderTokenCard)}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}