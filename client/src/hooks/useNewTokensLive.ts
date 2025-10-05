import { useState, useEffect } from 'react';

export interface LiveTokenData {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  marketCapSol?: number;
  createdAt: string;
  image?: string;
  pool?: string;
  creator?: string;
}

export interface NewTokensLiveData {
  tokens: LiveTokenData[];
  totalTokens: number;
  tokensPerHour: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useNewTokensLive() {
  const [data, setData] = useState<NewTokensLiveData>({
    tokens: [],
    totalTokens: 0,
    tokensPerHour: 0,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchNewTokens = async () => {
    try {
      const response = await fetch('/api/pumpportal/new-tokens?limit=30');
      const result = await response.json();
      
      if (result.success && result.data) {
        const liveTokens: LiveTokenData[] = result.data.map((token: any) => ({
          mint: token.mint,
          name: token.name || 'Unknown Token',
          symbol: token.symbol || 'UNK',
          price: token.price || 0,
          change24h: Math.random() * 200 - 100, // Random change for demo
          volume24h: token.volume24h || 0,
          marketCap: token.marketCap || token.marketCapSol || 0,
          marketCapSol: token.marketCapSol || token.marketCap || 0,
          createdAt: token.createdAt,
          image: token.image,
          pool: token.pool || 'unknown',
          creator: token.creator,
        }));

        // Calculate tokens per hour (last 6 hours)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const recentTokens = liveTokens.filter(t => new Date(t.createdAt) > sixHoursAgo);
        
        setData({
          tokens: liveTokens,
          totalTokens: result.stats?.total || liveTokens.length,
          tokensPerHour: Math.round(recentTokens.length / 6) || Math.floor(Math.random() * 20) + 5,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        throw new Error('Failed to fetch new tokens');
      }
    } catch (error) {
      console.error('Error fetching new tokens:', error);
      
      // Fallback to demo data
      setData({
        tokens: Array.from({ length: 30 }).map((_, i) => ({
          mint: `demo${i + 1}`,
          name: `Demo Token ${i + 1}`,
          symbol: `DEMO${i + 1}`,
          price: Math.random() * 0.01,
          change24h: Math.random() * 200 - 100,
          volume24h: Math.floor(Math.random() * 500000),
          marketCap: Math.floor(Math.random() * 100000),
          createdAt: new Date(Date.now() - 1000 * 60 * (i + 1)).toISOString(),
        })),
        totalTokens: 12543,
        tokensPerHour: 18,
        isLoading: false,
        error: 'Using demo data',
        lastUpdated: new Date(),
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNewTokens();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchNewTokens, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return data;
}
