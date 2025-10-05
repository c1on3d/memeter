// SOL Price Service
let cachedSolPrice = 140; // Default fallback price
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function getSolPrice(): Promise<number> {
  const now = Date.now();
  
  // Return cached price if fresh
  if (now - lastFetch < CACHE_DURATION) {
    return cachedSolPrice;
  }
  
  try {
    // Fetch SOL price from CoinGecko API
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    
    if (data.solana?.usd) {
      cachedSolPrice = data.solana.usd;
      lastFetch = now;
    }
  } catch (error) {
    console.warn('Failed to fetch SOL price, using cached value:', error);
  }
  
  return cachedSolPrice;
}

export function formatUSD(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}