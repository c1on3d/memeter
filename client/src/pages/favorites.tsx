import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TokenTable } from "@/components/TokenTable";
import { Star, ArrowLeft, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites, type FavoriteToken } from "@/contexts/FavoritesContext";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
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

  const renderTokenCard = (token: FavoriteToken) => (
    <div key={token.mint} className="flex items-center space-x-3 p-3 bg-card/50 border border-border/20 rounded-lg hover:bg-card/70 transition-colors">
      <div className="flex-shrink-0">
        {token.image ? (
          <img 
            src={token.image} 
            alt={token.name || token.symbol} 
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/30 flex items-center justify-center text-orange-400 font-bold text-sm ${token.image ? 'hidden' : ''}`}>
          {token.symbol?.charAt(0) || token.name?.charAt(0) || '?'}
        </div>
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