import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Get Solana price and volume
router.get('/api/price/sol', async (req, res) => {
  try {
    // Try DexScreener first
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${SOL_MINT}`);

    if (dexResponse.ok) {
      const data = await dexResponse.json() as any;
      const pairs = data?.pairs || [];

      // Filter for USDC pairs and pick highest liquidity
      const usdcPairs = pairs.filter(
        (p: any) => (p?.quoteToken?.symbol || '').toUpperCase() === 'USDC'
      );
      usdcPairs.sort(
        (a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0)
      );

      const best = usdcPairs[0];
      if (best) {
        const price = Number(best?.priceUsd || best?.priceNative || 0);
        const priceChange24h = Number(best?.priceChange?.h24 || 0);

        // Calculate total volume across all SOL pairs
        const totalVolume24h = pairs.reduce((sum: number, pair: any) => {
          return sum + (Number(pair?.volume?.h24 || 0));
        }, 0);

        return res.json({
          price,
          priceChange24h,
          volume24h: totalVolume24h,
          source: 'DexScreener',
          pair: best.pairAddress,
          liquidity: best.liquidity?.usd || 0,
        });
      }
    }

    // Fallback: CoinGecko (free, no API key needed)
    const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true');

    if (cgResponse.ok) {
      const cgData = await cgResponse.json() as any;
      const price = cgData?.solana?.usd || 0;
      const priceChange24h = cgData?.solana?.usd_24h_change || 0;
      const volume24h = cgData?.solana?.usd_24h_vol || 0;

      return res.json({
        price,
        priceChange24h,
        volume24h,
        source: 'CoinGecko',
      });
    }

    res.status(503).json({ error: 'Unable to fetch SOL price' });
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    res.status(500).json({ error: 'Failed to fetch SOL price' });
  }
});

// Get Solana network stats
router.get('/api/stats/solana', async (req, res) => {
  try {
    // Fetch top Solana pairs from DexScreener
    const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL');

    if (!response.ok) {
      return res.status(503).json({ error: 'Unable to fetch Solana stats' });
    }

    const data = await response.json() as any;
    const pairs = data?.pairs || [];

    // Calculate total volume across all Solana DEXs
    const totalVolume24h = pairs
      .filter((p: any) => p?.chainId === 'solana')
      .reduce((sum: number, pair: any) => sum + (Number(pair?.volume?.h24 || 0)), 0);

    // Calculate total liquidity
    const totalLiquidity = pairs
      .filter((p: any) => p?.chainId === 'solana')
      .reduce((sum: number, pair: any) => sum + (Number(pair?.liquidity?.usd || 0)), 0);

    // Count active pairs
    const activePairs = pairs.filter((p: any) => p?.chainId === 'solana').length;

    res.json({
      totalVolume24h,
      totalLiquidity,
      activePairs,
      source: 'DexScreener',
    });
  } catch (error) {
    console.error('Error fetching Solana stats:', error);
    res.status(500).json({ error: 'Failed to fetch Solana stats' });
  }
});

// Get any token price by mint address
router.get('/api/price/:mint', async (req, res) => {
  try {
    const { mint } = req.params;

    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);

    if (!response.ok) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const data = await response.json() as any;
    const pairs = data?.pairs || [];

    if (pairs.length === 0) {
      return res.status(404).json({ error: 'No trading pairs found' });
    }

    // Get highest liquidity pair
    pairs.sort((a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
    const best = pairs[0];

    res.json({
      mint,
      price: Number(best?.priceUsd || 0),
      priceChange24h: Number(best?.priceChange?.h24 || 0),
      priceChange6h: Number(best?.priceChange?.h6 || 0),
      volume24h: Number(best?.volume?.h24 || 0),
      liquidity: Number(best?.liquidity?.usd || 0),
      marketCap: Number(best?.marketCap || 0),
      pairAddress: best?.pairAddress,
      dexId: best?.dexId,
    });
  } catch (error) {
    console.error('Error fetching token price:', error);
    res.status(500).json({ error: 'Failed to fetch token price' });
  }
});

export default router;
