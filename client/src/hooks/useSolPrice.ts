import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/api';

export function useSolPrice() {
  return useQuery({
    queryKey: ['solPrice'],
    queryFn: async () => {
      try {
        // Use backend price endpoint for accurate SOL price
        const res = await fetch(buildApiUrl('/api/price/sol'));
        if (!res.ok) throw new Error('Backend SOL price fetch failed');
        const data = await res.json();
        
        const price = Number(data?.price || 0);
        const priceChange24h = Number(data?.priceChange24h || 0);
        const volume24h = Number(data?.volume24h || 0);

        if (price > 0) {
          console.log(`✅ SOL price from ${data.source}:`, price, `(${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%)`, `Vol: $${(volume24h / 1_000_000).toFixed(1)}M`);
          return { price, priceChange24h, volume24h };
        }
      } catch (error) {
        console.warn('Backend SOL price failed:', error);
      }

      // Fallback: Try DexScreener directly
      try {
        const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
        if (!res.ok) throw new Error('DexScreener SOL fetch failed');
        const data = await res.json();
        const pairs = data?.pairs || [];

        // Filter for USDC pairs and pick highest liquidity
        const usdcPairs = pairs.filter(
          (p: any) => (p?.quoteToken?.symbol || '').toUpperCase() === 'USDC'
        );
        usdcPairs.sort(
          (a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0)
        );
        const best = usdcPairs[0];
        const price = Number(best?.priceUsd || best?.priceNative || 0);
        const priceChange24h = Number(best?.priceChange?.h24 || 0);
        
        // Calculate total volume from all pairs
        const volume24h = pairs.reduce((sum: number, pair: any) => {
          return sum + (Number(pair?.volume?.h24 || 0));
        }, 0);

        if (price > 0) {
          console.log('✅ SOL price from DexScreener (fallback):', price, `(${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%)`, `Vol: $${(volume24h / 1_000_000).toFixed(1)}M`);
          return { price, priceChange24h, volume24h };
        }
      } catch (error) {
        console.warn('DexScreener SOL price failed:', error);
      }

      // No price available
      return { price: 0, priceChange24h: 0, volume24h: 0 };
    },
    refetchInterval: 30_000, // refresh every 30s
    staleTime: 20_000,
  });
}

