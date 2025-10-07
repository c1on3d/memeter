import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/api';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export function useSolPrice() {
  return useQuery({
    queryKey: ['solPrice'],
    queryFn: async () => {
      try {
        // Fetch SOL pairs from DexScreener via backend
        const res = await fetch(buildApiUrl(`/api/dexscreener/token/${SOL_MINT}`));
        if (!res.ok) throw new Error('DexScreener SOL fetch failed');
        const data = await res.json();
        const pairs = data?.data?.pairs || data?.pairs || [];

        // Filter for USDC pairs and pick highest liquidity
        const usdcPairs = pairs.filter(
          (p: any) => (p?.quoteToken?.symbol || '').toUpperCase() === 'USDC'
        );
        usdcPairs.sort(
          (a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0)
        );
        const best = usdcPairs[0];
        const price = Number(best?.priceUsd || best?.priceNative || 0);

        if (price > 0) {
          console.log('✅ SOL price from DexScreener:', price);
          return price;
        }
      } catch (error) {
        console.warn('DexScreener SOL price failed:', error);
      }

      // Fallback: Jupiter price API
      try {
        const jupRes = await fetch('https://price.jup.ag/v6/price?ids=SOL');
        if (jupRes.ok) {
          const jupData = await jupRes.json();
          const price = Number(jupData?.data?.SOL?.price || 0);
          if (price > 0) {
            console.log('✅ SOL price from Jupiter:', price);
            return price;
          }
        }
      } catch (error) {
        console.warn('Jupiter SOL price failed:', error);
      }

      // No fallback - return 0 if all sources fail
      return 0;
    },
    refetchInterval: 30_000, // refresh every 30s
    staleTime: 20_000,
  });
}

