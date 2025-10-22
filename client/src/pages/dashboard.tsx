import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { useSolPrice } from "@/hooks/useSolPrice";
import { Search, Wallet, TrendingUp, Activity, Timer, Target, RefreshCw, ExternalLinkIcon, Star, Copy, Globe, Twitter, Send, Users, Youtube, Instagram, Music2, MessageCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { buildApiUrl, API_ENDPOINTS } from "@/lib/api";

// Helper function to get proxied image URL through backend (bypasses CORS)
const getProxiedImageUrl = (imageUrl: string | null | undefined, backendUrl: string): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.endsWith('.json')) return null; // don't try to render metadata as image

  // Normalize backend URL (no trailing slash)
  const base = backendUrl.replace(/\/+$/, '');

  // If backend already gave a proxied path like "/api/image-proxy?url=..."
  if (/^\/api\/image-proxy\?url=/.test(imageUrl)) {
    // Convert relative proxy URL to absolute
    return `${base}${imageUrl}`;
  }

  // If it's already a full proxy URL from backend, use as-is
  if (imageUrl.startsWith(base + '/api/image-proxy')) {
    return imageUrl;
  }

  // If it's a direct HTTP/HTTPS URL, proxy it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return `${base}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // Otherwise return null (invalid URL)
  return null;
};

// Token Image Component - Hover to preview
function TokenImage({ mint, symbol, uri, directImage }: { mint: string, symbol: string, uri?: string | null, directImage?: string | null }) {
  const backendUrl = buildApiUrl('');
  // Prefer backend-provided image; ignore uri if it's metadata
  const rawImage = directImage || (uri && !uri.endsWith('.json') ? uri : null);
  const imageSrc = backendUrl ? getProxiedImageUrl(rawImage, backendUrl) : null;
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={`relative w-10 h-10 flex-shrink-0 ${imageSrc ? 'ring-2 ring-white/70 hover:ring-white transition-all cursor-pointer rounded-full' : ''}`}
          title={imageSrc ? 'Hover to preview' : undefined}
        >
          {imageSrc && (
            <img 
              src={imageSrc}
              alt={symbol}
              className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                console.log(`Image proxy failed for ${symbol}:`, imageSrc);
              }}
            />
          )}
          <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {symbol?.charAt(0)?.toUpperCase() || 'T'}
          </div>
        </div>
      </HoverCardTrigger>
      {imageSrc && (
        <HoverCardContent side="left" align="start" className="w-auto p-1 border-0 bg-card/95 shadow-2xl">
          <img
            src={imageSrc}
            alt={symbol}
            className="w-48 h-48 rounded-lg object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  type SearchResult = { type: 'dex'; pair: any } | { type: 'pump'; token: any };
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Authentication check - redirect to landing if not authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('memeter_authenticated');
    if (!isAuthenticated) {
      // Temporarily disabled for testing - auto-authenticate
      console.log('Auto-authenticating for testing');
      localStorage.setItem('memeter_authenticated', 'true');
      // Uncomment below to re-enable auth requirement:
      // console.log('Dashboard access denied - not authenticated, redirecting to landing');
      // setLocation('/');
    }
  }, [setLocation]);

  // Click away handler to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchQuery("");
        setSearchResults([]);
        setSearchError(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { theme } = useTheme();
  const { toast } = useToast();
  const { toggleCategorizedFavorite, isFavorite } = useFavorites();

  // Helpers
  const isSolAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((s || '').trim());

  // Placeholder risk scoring until backend logic is provided
  const computeRiskScore = (t: any): number => {
    // TODO: replace with real risk model; for now return 0
    return 0;
  };
  const handleSummarize = (t: any) => {
    toast({ title: 'Summary', description: 'Token summary coming soon.' });
    console.log('Summarize token:', t);
  };

  // Extract common social/website links from token data (uri metadata might be proxied)
  const extractLinks = (t: any) => {
    const links: { website?: string; twitter?: string; telegram?: string; discord?: string; youtube?: string; instagram?: string; reddit?: string; tiktok?: string } = {};
    // Prefer direct fields if backend provides them
    if (t.website) links.website = t.website;
    if (t.twitter) links.twitter = t.twitter;
    if (t.telegram) links.telegram = t.telegram;
    if (t.discord) links.discord = t.discord;
    if (t.youtube) links.youtube = t.youtube;
    if (t.instagram) links.instagram = t.instagram;
    if (t.reddit) links.reddit = t.reddit;
    if (t.tiktok) links.tiktok = t.tiktok;
    // Some backends embed a 'links' object
    if (t.links) {
      links.website = links.website || t.links.website;
      links.twitter = links.twitter || t.links.twitter;
      links.telegram = links.telegram || t.links.telegram;
      links.discord = links.discord || t.links.discord;
      links.youtube = links.youtube || t.links.youtube;
      links.instagram = links.instagram || t.links.instagram;
      links.reddit = links.reddit || t.links.reddit;
      links.tiktok = links.tiktok || t.links.tiktok;
    }
    
    // Debug: Log when we find links
    const hasLinks = Object.values(links).some(v => !!v);
    if (hasLinks) {
      console.log(`🔗 Found links for ${t.symbol}:`, links);
    }
    
    return links;
  };

  // URL detectors for hover previews
  const looksLikeTweetUrl = (url?: string) => !!url && /(twitter|x)\.com\/[^/]+\/status\//i.test(url);
  const looksLikeTwitterCommunityUrl = (url?: string) => !!url && /(twitter|x)\.com\/(i\/communities|communities)/i.test(url);

  // Normalize Twitter/X links to twitter.com for reliable embedding
  const normalizeTwitterUrl = (url?: string): string => {
    if (!url) return '';
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host === 'x.com' || host.endsWith('.x.com')) u.hostname = 'twitter.com';
      if (host === 'mobile.twitter.com') u.hostname = 'twitter.com';
      return u.toString();
    } catch {
      return url;
    }
  };

  // Extract hostname for simple preview cards
  const extractHostname = (url?: string): string => {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./i, '');
    } catch {
      return '';
    }
  };

  // Detect known platform from URL for icon selection
  const detectPlatform = (url?: string): 'twitter' | 'telegram' | 'discord' | 'youtube' | 'instagram' | 'reddit' | 'tiktok' | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) return 'twitter';
      if (host === 't.me' || host.endsWith('.t.me') || host === 'telegram.me' || host.endsWith('.telegram.me')) return 'telegram';
      if (host === 'discord.gg' || host.endsWith('.discord.gg') || host === 'discord.com' || host.endsWith('.discord.com')) return 'discord';
      if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube';
      if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
      if (host === 'reddit.com' || host.endsWith('.reddit.com')) return 'reddit';
      if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
      return null;
    } catch {
      return null;
    }
  };

  // Wallet connection
  const { connected, publicKey, connect, disconnect, isPhantomInstalled } = usePhantomWallet();

  // Fetch new tokens from backend
  const { data: newTokensData, refetch: refetchNewTokens, isLoading: isLoadingNewTokens, error: newTokensError } = useQuery({
    queryKey: ['newTokens'],
    queryFn: async () => {
      console.log('🔵 Fetching new tokens from:', buildApiUrl(API_ENDPOINTS.NEW_TOKENS));
      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.NEW_TOKENS}?limit=50`));
      if (!response.ok) {
        console.error('❌ Failed to fetch new tokens:', response.status, response.statusText);
        throw new Error('Failed to fetch new tokens');
      }
      const rawData = await response.json();
      
      // Backend returns an array directly, transform to expected format
      const tokens = Array.isArray(rawData) ? rawData : [];
      const data = { tokens, count: tokens.length };
      
      console.log('✅ New tokens received:', data.count, 'tokens');
      console.log('📊 First token:', data.tokens?.[0]);
      
      // Debug: Check if tokens have social links
      if (data.tokens?.[0]) {
        const firstToken = data.tokens[0];
        console.log('🔍 First token fields:', {
          hasImage: !!firstToken.image,
          hasUri: !!firstToken.uri,
          hasWebsite: !!firstToken.website,
          hasTwitter: !!firstToken.twitter,
          hasTelegram: !!firstToken.telegram,
          hasDiscord: !!firstToken.discord,
        });
      }
      
      return data; // Returns { tokens: [...], count }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3,
  });

  // Fetch all tokens
  const { data: allTokensData, refetch: refetchTokens } = useQuery({
    queryKey: ['allTokens'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.TOKENS}?limit=100`));
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const rawData = await response.json();
      
      // Backend returns an array directly, transform to expected format
      const tokens = Array.isArray(rawData) ? rawData : [];
      return { tokens, count: tokens.length };
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch recent migrations
  const { data: migrationsData, refetch: refetchMigrations, isLoading: isLoadingMigrations, error: migrationsError } = useQuery({
    queryKey: ['migrations'],
    queryFn: async () => {
      console.log('🔵 Fetching migrations from:', buildApiUrl('/migrations'));
      const response = await fetch(buildApiUrl('/migrations?limit=30'));
      if (!response.ok) {
        console.error('❌ Failed to fetch migrations:', response.status, response.statusText);
        throw new Error('Failed to fetch migrations');
      }
      const data = await response.json();
      // Handle both array and object responses
      const tokens = Array.isArray(data) ? data : (data.tokens || []);
      console.log('✅ Migrations received:', tokens.length, 'tokens');
      if (tokens.length > 0) {
        console.log('📊 First migration:', tokens[0]);
      }
      return { tokens, count: tokens.length };
    },
    refetchInterval: 15000,
    retry: 3,
  });

  // Fetch DexScreener trending tokens
  const { data: dexScreenerData, refetch: refetchDexScreener, isLoading: isLoadingTrending, error: trendingError } = useQuery({
    queryKey: ['dexScreener'],
    queryFn: async () => {
      console.log('🔵 Fetching trending Solana tokens from DexScreener');
      
      // Fetch top Solana pairs by 24h volume
      const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
      if (!response.ok) {
        console.error('❌ Failed to fetch trending tokens, trying alternative endpoint');
        // Fallback: Get pairs from multiple popular Solana tokens
        const fallbackResponse = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        if (!fallbackResponse.ok) throw new Error('Failed to fetch trending tokens');
        const fallbackData = await fallbackResponse.json();
        
        // Track seen mints to avoid duplicates
        const seenMints = new Set<string>();
        
        const tokens = (fallbackData?.pairs || [])
          .filter((p: any) => {
            if (p?.chainId !== 'solana') return false;
            const marketCap = Number(p?.marketCap || 0);
            if (marketCap < 15000) return false;
            const mint = p?.baseToken?.address;
            if (!mint || seenMints.has(mint)) return false;
            seenMints.add(mint);
            return true;
          })
          .sort((a: any, b: any) => (b?.volume?.h24 || 0) - (a?.volume?.h24 || 0))
          .slice(0, 30)
          .map((pair: any) => ({
            mint: pair.baseToken?.address,
            name: pair.baseToken?.name || 'Unknown',
            symbol: pair.baseToken?.symbol || 'UNKNOWN',
            image: pair.info?.imageUrl || null,
            marketCapSol: Number(pair.marketCap || 0) / solanaPrice,
            marketCapUsd: Number(pair.marketCap || 0),
            priceUsd: Number(pair.priceUsd || 0),
            pairAddress: pair.pairAddress,
            volume24h: Number(pair.volume?.h24 || 0),
            volume6h: Number(pair.volume?.h6 || 0),
            priceChange24h: Number(pair.priceChange?.h24 || 0),
            priceChange6h: Number(pair.priceChange?.h6 || 0),
            liquidity: Number(pair.liquidity?.usd || 0),
            dexId: pair.dexId,
            // Social links from DexScreener
            website: pair.info?.websites?.[0]?.url || null,
            twitter: pair.info?.socials?.find((s: any) => s.type === 'twitter')?.url || null,
            telegram: pair.info?.socials?.find((s: any) => s.type === 'telegram')?.url || null,
            discord: pair.info?.socials?.find((s: any) => s.type === 'discord')?.url || null,
          }));
        
        console.log('✅ Trending tokens received (fallback):', tokens.length);
        if (tokens.length > 0) {
          console.log('🔗 First trending token social links (fallback):', {
            symbol: tokens[0].symbol,
            website: tokens[0].website,
            twitter: tokens[0].twitter,
            telegram: tokens[0].telegram,
            discord: tokens[0].discord,
          });
        }
        return { tokens };
      }
      
      const profiles = await response.json();
      
      // Get token addresses from profiles and fetch their pairs
      const solanaProfiles = profiles.filter((p: any) => p?.chainId === 'solana').slice(0, 50);
      const tokenAddresses = solanaProfiles.map((p: any) => p?.tokenAddress).filter(Boolean).join(',');
      
      if (!tokenAddresses) {
        console.log('No Solana tokens in profiles, using empty array');
        return { tokens: [] };
      }
      
      const pairsResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`);
      if (!pairsResponse.ok) throw new Error('Failed to fetch token pairs');
      const pairsData = await pairsResponse.json();
      
      // Track seen mints to avoid duplicates
      const seenMints = new Set<string>();
      
      // Transform, filter, and sort by volume
      const tokens = (pairsData?.pairs || [])
        .filter((p: any) => {
          // Filter: Solana chain only
          if (p?.chainId !== 'solana') return false;
          
          // Filter: Market cap >= $15,000
          const marketCap = Number(p?.marketCap || 0);
          if (marketCap < 15000) return false;
          
          // Filter: No duplicates
          const mint = p?.baseToken?.address;
          if (!mint || seenMints.has(mint)) return false;
          seenMints.add(mint);
          
          return true;
        })
        .filter((p: any) => p?.chainId === 'solana')
        .sort((a: any, b: any) => (b?.volume?.h24 || 0) - (a?.volume?.h24 || 0))
        .slice(0, 30)
        .map((pair: any) => ({
          mint: pair.baseToken?.address,
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || 'UNKNOWN',
          image: pair.info?.imageUrl || null,
          marketCapSol: Number(pair.marketCap || 0) / solanaPrice,
          marketCapUsd: Number(pair.marketCap || 0),
          priceUsd: Number(pair.priceUsd || 0),
          pairAddress: pair.pairAddress,
          volume24h: Number(pair.volume?.h24 || 0),
          volume6h: Number(pair.volume?.h6 || 0),
          priceChange24h: Number(pair.priceChange?.h24 || 0),
          priceChange6h: Number(pair.priceChange?.h6 || 0),
          liquidity: Number(pair.liquidity?.usd || 0),
          dexId: pair.dexId,
        }));
      
      console.log('✅ Trending tokens received:', tokens.length);
      if (tokens.length > 0) {
        console.log('🔗 First trending token social links:', {
          symbol: tokens[0].symbol,
          website: tokens[0].website,
          twitter: tokens[0].twitter,
          telegram: tokens[0].telegram,
          discord: tokens[0].discord,
        });
      }
      return { tokens };
    },
    refetchInterval: 20000, // Refetch every 20 seconds
  });

  // Calculate stats from fetched data - handle the actual backend response structure
  const rawNewTokens = Array.isArray((newTokensData as any)?.tokens) ? (newTokensData as any).tokens : [];
  // Sort tokens by timestamp (newest first)
  const newTokens = [...rawNewTokens].sort((a: any, b: any) => {
    const dateA = new Date(a.timestamp || 0).getTime();
    const dateB = new Date(b.timestamp || 0).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
  
  const allTokens = Array.isArray((allTokensData as any)?.tokens) ? (allTokensData as any).tokens : (Array.isArray(allTokensData) ? (allTokensData as any) : []);
  const { data: solPriceData } = useSolPrice();
  const solanaPrice = solPriceData?.price || 0;
  const solanaPriceChange24h = solPriceData?.priceChange24h || 0;
  const solanaVolume24h = (solPriceData as any)?.volume24h || 0;
  const totalTokens = newTokensData?.count || newTokens.length || 0;
  const tokensPerHour = Math.floor(totalTokens / 24) || 0;
  const migrations = Array.isArray((migrationsData as any)?.tokens) ? (migrationsData as any).tokens : [];
  const totalMigrations = migrations.length;
  
  // Get trending tokens (already sorted by trendingScoreH6 from backend)
  const trendingTokens = Array.isArray((dexScreenerData as any)?.tokens)
    ? (dexScreenerData as any).tokens
    : [];
  const trendingCount = trendingTokens.length;
  
  // Migration Threshold (standard Raydium threshold in SOL)
  const migrationThreshold = 412; // SOL
  
  // Market Sentiment (% of trending tokens with positive 6h change)
  const positiveCount = trendingTokens.filter((t: any) => (t?.priceChange?.h6 || 0) > 0).length;
  const marketSentiment = trendingTokens.length > 0 ? Math.round((positiveCount / trendingTokens.length) * 100) : 0;

  // Sentiment color classes (dynamic)
  const sentimentStyles = marketSentiment >= 60
    ? { card: 'from-green-500/10 to-green-600/5 border-green-500/20', icon: 'text-green-500', value: 'text-green-600' }
    : marketSentiment >= 40
      ? { card: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20', icon: 'text-yellow-500', value: 'text-yellow-600' }
      : { card: 'from-red-500/10 to-red-600/5 border-red-500/20', icon: 'text-red-500', value: 'text-red-600' };

  // Debug logging
  useEffect(() => {
    console.log('📈 Dashboard State:', {
      isLoadingNewTokens,
      newTokensError: newTokensError?.message,
      newTokensCount: newTokens.length,
      totalTokens,
      hasData: !!newTokensData,
      isLoadingMigrations,
      migrationsError: migrationsError?.message,
      migrations: migrations.length,
      trendingTokens: trendingTokens.length,
    });
  }, [isLoadingNewTokens, newTokensError, newTokens.length, totalTokens, newTokensData, isLoadingMigrations, migrationsError, migrations.length, trendingTokens.length]);

  // Debounced search for SPL tokens (by address or symbol/name)
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    
    const id = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        // Use backend search endpoint (includes database + DexScreener + Helius)
        const response = await fetch(buildApiUrl(`/search?q=${encodeURIComponent(q)}&limit=20`));
        
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const results = await response.json();
        const combined: SearchResult[] = results.map((token: any) => ({
          type: 'pump',
          token: token
        }));

        setSearchResults(combined);
      } catch (e: any) {
        setSearchError(e?.message || 'Search failed');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(id);
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
                  src="/memeter-logo.png" 
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
              <div className="relative" ref={searchContainerRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search SPL by address, symbol, or name..."
                  className="pl-10 w-96"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {(searchLoading || searchError || searchResults.length > 0) && (
                  <div className={`absolute mt-2 w-[28rem] max-h-96 overflow-y-auto z-50 border border-border/50 rounded-lg shadow-lg p-2 ${isSolAddress(searchQuery.trim()) ? 'bg-black' : 'bg-card/95'}`}>
                    {searchLoading && (
                      <div className="py-4 text-sm text-muted-foreground text-center">Searching…</div>
                    )}
                    {searchError && (
                      <div className="py-4 text-sm text-red-500 text-center">Error: {searchError}</div>
                    )}
                    {!searchLoading && !searchError && searchResults.length === 0 && searchQuery && (
                      <div className="py-4 text-sm text-muted-foreground text-center">No results</div>
                    )}
                    {!searchLoading && !searchError && searchResults.map((item, i: number) => {
                      const backendBase = buildApiUrl('');
                      if (item.type === 'dex') {
                        const pair = item.pair;
                        return (
                          <a
                            key={pair?.pairAddress || `dex-${i}`}
                            href={`https://dexscreener.com/solana/${pair?.pairAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 px-2 py-2 rounded hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 flex-shrink-0">
                                {pair?.info?.imageUrl && (
                                  <img
                                    src={pair.info.imageUrl}
                                    alt={pair?.baseToken?.symbol}
                                    className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10 ring-2 ring-white/20"
                                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                  />
                                )}
                                <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                                  {(pair?.baseToken?.symbol || 'T').slice(0, 2).toUpperCase()}
                  </div>
                              </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {pair?.baseToken?.name || pair?.baseToken?.symbol || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {pair?.baseToken?.symbol}
                              </span>
                            </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs font-semibold ${((pair?.priceChange?.h6 || 0) >= 0) ? 'text-green-500' : 'text-red-500'}`}>
                                {((pair?.priceChange?.h6 || 0) >= 0 ? '+' : '') + (pair?.priceChange?.h6 || 0).toFixed(2)}% 6h
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {(pair?.volume?.h6 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} vol
                              </div>
                            </div>
                          </a>
                        );
                      }
                      // PumpPortal token
                      const t = item.token;
                      const launchpadUrl =
                        t.pool === 'pump'
                          ? `https://pump.fun/${t.mint}`
                          : t.pool === 'bonk'
                            ? `https://bonk.fun/${t.mint}`
                            : t.pool === 'bsc'
                              ? `https://bscscan.com/token/${t.mint}`
                              : `https://solscan.io/token/${t.mint}`;
                      const proxiedImg = getProxiedImageUrl(t.image || t.uri, backendBase);
                      return (
                        <a
                          key={t?.mint || `pump-${i}`}
                          href={launchpadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 px-2 py-2 rounded hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 flex-shrink-0">
                              {proxiedImg && (
                                <img
                                  src={proxiedImg}
                                  alt={t?.symbol}
                                  className="absolute inset-0 w-10 h-10 rounded-full object-cover z-10 ring-2 ring-white/20"
                                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                />
                              )}
                              <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {(t?.symbol || 'T').slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {t?.name || t?.symbol || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t?.symbol}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">
                              ${((t?.marketCapUsd || (t?.marketCapSol || 0) * solanaPrice)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Market Cap
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Live Solana Price */}
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-2xl text-white transform -skew-x-6 drop-shadow-lg animate-pulse hover:scale-105 transition-transform duration-300">◎</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">
                    ${solanaPrice.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium ${solanaPriceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {solanaPriceChange24h >= 0 ? '+' : ''}{solanaPriceChange24h.toFixed(2)}%
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
                variant="secondary" 
                size="sm" 
                asChild
                className="hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/20 hover:shadow-purple-500/25"
              >
                <Link href="/agent">
                  <Bot className="h-4 w-4 mr-2 transition-transform duration-200 hover:scale-110" />
                  Agent
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

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solana Volume</p>
                  <p className="text-3xl font-bold text-orange-600">${(solanaVolume24h / 1_000_000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Timer className="inline h-3 w-3 mr-1" />
                    24h trading
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Activity className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Migration Threshold</p>
                  <p className="text-3xl font-bold text-purple-600">${((migrationThreshold * solanaPrice) / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1 animate-pulse block"></span>
                      {migrationThreshold} SOL threshold
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Target className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${sentimentStyles.card} hover:shadow-lg transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Market Sentiment</p>
                  <p className={`text-3xl font-bold ${sentimentStyles.value}`}>{marketSentiment}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <TrendingUp className={`inline h-3 w-3 mr-1 ${sentimentStyles.icon}`} />
                    Positive (6h)
                  </p>
                </div>
                <div className="p-3 rounded-full">
                  <TrendingUp className={`h-6 w-6 ${sentimentStyles.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* New Tokens Created */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                New Tokens Created
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchNewTokens()}
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
                  // Use DexScreener market cap if available, otherwise calculate from SOL
                  const marketCapUSD = token.marketCapUsd 
                    ? token.marketCapUsd.toFixed(2)
                    : token.marketCapSol 
                      ? (token.marketCapSol * solanaPrice).toFixed(2) 
                      : '0';
                  const launchpadUrl = token.pool === 'pump' 
                    ? `https://pump.fun/${token.mint}` 
                    : token.pool === 'bonk' 
                      ? `https://bonk.fun/${token.mint}`
                      : token.pool === 'bsc'
                        ? `https://bscscan.com/token/${token.mint}`
                        : null;
                  
                  return (
                    <div key={token.mint || index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                          {/* Token Image - Uses Pump.fun CDN */}
                          <TokenImage mint={token.mint} symbol={token.symbol} uri={token.uri} directImage={token.image} />
                          
                          <div>
                            <div className="flex items-center gap-2 font-medium text-sm">
                              <span>{token.name || token.symbol || 'Unknown'}</span>
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
                              {/* Social icons if present */}
                              {(() => {
                                const { website, twitter, telegram, discord, youtube, instagram, reddit, tiktok } = extractLinks(token);
                                // If only one link and it is a twitter status, show Twitter icon pointing at that
                                // If it looks like a community link (e.g., pump.fun/community, dexscreener.com/solana/{pair}, or discord/telegram), show Users icon
                                const looksLikeTweet = (url?: string) => !!url && /(twitter|x)\.com\/[^/]+\/status\//i.test(url);
                                const looksLikeTwitterCommunity = (url?: string) => !!url && /(twitter|x)\.com\/(i\/communities|communities)/i.test(url);
                                const looksLikeCommunity = (url?: string) => !!url && /(discord\.gg|discord\.com\/invite|t\.me\/|pump\.fun\/community|dexscreener\.com\/solana)/i.test(url);

                                const icons: JSX.Element[] = [];
                                if (website) {
                                  const platform = detectPlatform(website);
                                  const icon = platform === 'twitter' ? <Twitter className="h-3.5 w-3.5" />
                                    : platform === 'telegram' ? <Send className="h-3.5 w-3.5" />
                                    : platform === 'discord' ? <Users className="h-3.5 w-3.5" />
                                    : platform === 'youtube' ? <Youtube className="h-3.5 w-3.5" />
                                    : platform === 'instagram' ? <Instagram className="h-3.5 w-3.5" />
                                    : platform === 'reddit' ? <MessageCircle className="h-3.5 w-3.5" />
                                    : platform === 'tiktok' ? <Music2 className="h-3.5 w-3.5" />
                                    : <Globe className="h-3.5 w-3.5" />;
                              icons.push(
                                    <a key="web" href={website} target="_blank" rel="noopener noreferrer" title="Website" className="text-muted-foreground hover:text-foreground">
                                      {icon}
                                    </a>
                                  );
                                }
                                if (twitter) {
                                  if (looksLikeTwitterCommunity(twitter)) {
                                    icons.push(
                                      <a key="twcomm" href={twitter} target="_blank" rel="noopener noreferrer" title="Twitter Community" className="text-muted-foreground hover:text-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                      </a>
                                    );
                                  } else {
                                    icons.push(
                                      <a key="tw" href={twitter} target="_blank" rel="noopener noreferrer" title={looksLikeTweet(twitter) ? 'Tweet' : 'Twitter'} className="text-muted-foreground hover:text-foreground">
                                        <Twitter className="h-3.5 w-3.5" />
                                      </a>
                                    );
                                  }
                                }
                                if (telegram) icons.push(
                                  <a key="tg" href={telegram} target="_blank" rel="noopener noreferrer" title="Telegram" className="text-muted-foreground hover:text-foreground">
                                    <Send className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (discord) icons.push(
                                  <a key="dc" href={discord} target="_blank" rel="noopener noreferrer" title="Discord" className="text-muted-foreground hover:text-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (youtube) icons.push(
                                  <a key="yt" href={youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="text-red-500 hover:text-red-600">
                                    <Youtube className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (instagram) icons.push(
                                  <a key="ig" href={instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="text-pink-500 hover:text-pink-600">
                                    <Instagram className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (reddit) icons.push(
                                  <a key="rd" href={reddit} target="_blank" rel="noopener noreferrer" title="Reddit" className="text-orange-500 hover:text-orange-600">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (tiktok) icons.push(
                                  <a key="tt" href={tiktok} target="_blank" rel="noopener noreferrer" title="TikTok" className="text-foreground hover:opacity-80">
                                    <Music2 className="h-3.5 w-3.5" />
                                  </a>
                                );
                                // If none detected but there is a community-like URL in website, show Users
                                if (!icons.length && looksLikeCommunity(website)) {
                                  icons.push(
                                    <a key="comm" href={website!} target="_blank" rel="noopener noreferrer" title="Community" className="text-muted-foreground hover:text-foreground">
                                      <Users className="h-3.5 w-3.5" />
                                    </a>
                                  );
                                }
                                return icons.length ? <span className="inline-flex items-center gap-1">{icons}</span> : null;
                              })()}
                        </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{token.symbol || 'N/A'}</span>
                              {launchpadUrl && (
                                <>
                                  <a 
                                    href={launchpadUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                    className={`text-xs px-2 py-0.5 rounded border ${
                                      token.pool === 'pump' 
                                        ? 'text-green-500 border-green-500 hover:bg-green-500/10' 
                                        : token.pool === 'bonk'
                                          ? 'text-orange-500 border-orange-500 hover:bg-orange-500/10'
                                          : token.pool === 'bsc'
                                            ? 'text-yellow-500 border-yellow-500 hover:bg-yellow-500/10'
                                            : 'text-blue-500 border-blue-500 hover:bg-blue-500/10'
                                    }`}
                                    title={`View on ${token.pool === 'pump' ? 'Pump.fun' : token.pool === 'bonk' ? 'Bonk.fun' : token.pool === 'bsc' ? 'BscScan' : 'Explorer'}`}
                                  >
                                    {token.pool === 'pump' ? 'pump.fun' : token.pool === 'bonk' ? 'bonk.fun' : token.pool === 'bsc' ? 'bscscan' : 'explorer'}
                                  </a>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 px-2 text-purple-500 border-purple-500 hover:bg-purple-500/10"
                                    onClick={(e) => { e.preventDefault(); handleSummarize(token); }}
                                  >
                                    Analyze
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">${Number(marketCapUSD).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Market Cap</div>
                            <div className="text-[10px] text-muted-foreground">Risk: {computeRiskScore(token)}/100</div>
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
                                  image: token.image || (token.uri ? getProxiedImageUrl(token.uri, buildApiUrl('')) || undefined : undefined),
                                  pool: token.pool,
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
              {isLoadingTrending ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading trending tokens...</p>
                </div>
              ) : trendingError ? (
                <div className="text-center py-8 text-red-500">
                  <p>❌ Error loading trending</p>
                  <p className="text-xs mt-2">{String(trendingError)}</p>
                </div>
              ) : trendingTokens.length > 0 ? (
                trendingTokens.map((token: any, index: number) => {
                  const marketCapUSD = token.marketCapUsd || (token.marketCapSol ? (token.marketCapSol * solanaPrice) : 0);
                  const dexScreenerUrl = token.pairAddress ? `https://dexscreener.com/solana/${token.pairAddress}` : null;
                  

                  return (
                    <div key={token.mint || index} className="bg-card/30 border border-border/10 rounded-lg p-3 hover:bg-card/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <TokenImage mint={token.mint} symbol={token.symbol} uri={null} directImage={token.image} />
                          
                          <div>
                            <div className="flex items-center gap-2 font-medium text-sm">
                              <span>{token.name || token.symbol || 'Unknown'}</span>
                              <button
                                type="button"
                                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(token.mint || '');
                                    toast({ title: 'Copied', description: 'Copied to clipboard' });
                                  } catch {}
                                }}
                                title="Copy"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {/* Social icons if present */}
                              {(() => {
                                const { website, twitter, telegram, discord, youtube, instagram, reddit, tiktok } = extractLinks(token);
                                const looksLikeTweet = (url?: string) => !!url && /(twitter|x)\.com\/[^/]+\/status\//i.test(url);
                                const looksLikeTwitterCommunity = (url?: string) => !!url && /(twitter|x)\.com\/(i\/communities|communities)/i.test(url);
                                const looksLikeCommunity = (url?: string) => !!url && /(discord\.gg|discord\.com\/invite|t\.me\/|pump\.fun\/community|dexscreener\.com\/solana)/i.test(url);

                                const icons: JSX.Element[] = [];
                                if (website) {
                                  const platform = detectPlatform(website);
                                  const icon = platform === 'twitter' ? <Twitter className="h-3.5 w-3.5" />
                                    : platform === 'telegram' ? <Send className="h-3.5 w-3.5" />
                                    : platform === 'discord' ? <Users className="h-3.5 w-3.5" />
                                    : platform === 'youtube' ? <Youtube className="h-3.5 w-3.5" />
                                    : platform === 'instagram' ? <Instagram className="h-3.5 w-3.5" />
                                    : platform === 'reddit' ? <MessageCircle className="h-3.5 w-3.5" />
                                    : platform === 'tiktok' ? <Music2 className="h-3.5 w-3.5" />
                                    : <Globe className="h-3.5 w-3.5" />;
                                  icons.push(
                                    <a key="web" href={website} target="_blank" rel="noopener noreferrer" title="Website" className="text-muted-foreground hover:text-foreground">
                                      {icon}
                                    </a>
                                  );
                                }
                                if (twitter) {
                                  if (looksLikeTwitterCommunity(twitter)) {
                                    icons.push(
                                      <a key="twcomm" href={twitter} target="_blank" rel="noopener noreferrer" title="Twitter Community" className="text-muted-foreground hover:text-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                      </a>
                                    );
                                  } else {
                                    icons.push(
                                      <a key="tw" href={twitter} target="_blank" rel="noopener noreferrer" title={looksLikeTweet(twitter) ? 'Tweet' : 'Twitter'} className="text-muted-foreground hover:text-foreground">
                                        <Twitter className="h-3.5 w-3.5" />
                                      </a>
                                    );
                                  }
                                }
                                if (telegram) icons.push(
                                  <a key="tg" href={telegram} target="_blank" rel="noopener noreferrer" title="Telegram" className="text-muted-foreground hover:text-foreground">
                                    <Send className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (discord) icons.push(
                                  <a key="dc" href={discord} target="_blank" rel="noopener noreferrer" title="Discord" className="text-muted-foreground hover:text-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (youtube) icons.push(
                                  <a key="yt" href={youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="text-red-500 hover:text-red-600">
                                    <Youtube className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (instagram) icons.push(
                                  <a key="ig" href={instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="text-pink-500 hover:text-pink-600">
                                    <Instagram className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (reddit) icons.push(
                                  <a key="rd" href={reddit} target="_blank" rel="noopener noreferrer" title="Reddit" className="text-orange-500 hover:text-orange-600">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (tiktok) icons.push(
                                  <a key="tt" href={tiktok} target="_blank" rel="noopener noreferrer" title="TikTok" className="text-foreground hover:opacity-80">
                                    <Music2 className="h-3.5 w-3.5" />
                                  </a>
                                );
                                if (!icons.length && looksLikeCommunity(website)) {
                                  icons.push(
                                    <a key="comm" href={website!} target="_blank" rel="noopener noreferrer" title="Community" className="text-muted-foreground hover:text-foreground">
                                      <Users className="h-3.5 w-3.5" />
                                    </a>
                                  );
                                }
                                return icons.length ? <span className="inline-flex items-center gap-1">{icons}</span> : null;
                              })()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{token.symbol || 'N/A'}</span>
                              {dexScreenerUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-5 px-2 text-purple-500 border-purple-500 hover:bg-purple-500/10"
                                  onClick={(e) => { e.preventDefault(); handleSummarize(token); }}
                                >
                                  Analyze
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">${Number(marketCapUSD).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Market Cap</div>
                            <div className="text-[10px] text-muted-foreground">Risk: {computeRiskScore(token)}/100</div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <a 
                              href={`https://solscan.io/token/${token.mint}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-blue-500 transition-colors"
                              title="View on Solscan"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toggleCategorizedFavorite({
                                  mint: token.mint,
                                  category: 'trending',
                                  name: token.name,
                                  symbol: token.symbol,
                                  marketCap: Number(marketCapUSD),
                                  image: token.image,
                                  pool: token.pool,
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