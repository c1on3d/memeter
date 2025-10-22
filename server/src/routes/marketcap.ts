import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Get real-time market cap for a token
router.get('/api/marketcap/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const data = await response.json();
    const pairs = data?.pairs || [];
    
    if (pairs.length === 0) {
      return res.status(404).json({ error: 'No trading pairs found' });
    }
    
    // Get highest liquidity pair
    pairs.sort((a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
    const best = pairs[0];
    
    res.json({
      mint,
      marketCapUsd: Number(best?.marketCap || 0),
      priceUsd: Number(best?.priceUsd || 0),
      liquidity: Number(best?.liquidity?.usd || 0),
      volume24h: Number(best?.volume?.h24 || 0),
      priceChange24h: Number(best?.priceChange?.h24 || 0),
      pairAddress: best?.pairAddress,
    });
  } catch (error) {
    console.error('Error fetching market cap:', error);
    res.status(500).json({ error: 'Failed to fetch market cap' });
  }
});

// Get market caps for multiple tokens (batch)
router.post('/api/marketcap/batch', async (req, res) => {
  try {
    const { mints } = req.body;
    
    if (!Array.isArray(mints) || mints.length === 0) {
      return res.status(400).json({ error: 'Mints array required' });
    }
    
    // Limit to 10 tokens per batch to avoid rate limits
    const limitedMints = mints.slice(0, 10);
    
    const results = await Promise.all(
      limitedMints.map(async (mint: string) => {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
          if (!response.ok) return { mint, marketCapUsd: 0 };
          
          const data = await response.json();
          const pairs = data?.pairs || [];
          if (pairs.length === 0) return { mint, marketCapUsd: 0 };
          
          pairs.sort((a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
          const best = pairs[0];
          
          return {
            mint,
            marketCapUsd: Number(best?.marketCap || 0),
            priceUsd: Number(best?.priceUsd || 0),
          };
        } catch (e) {
          return { mint, marketCapUsd: 0 };
        }
      })
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching batch market caps:', error);
    res.status(500).json({ error: 'Failed to fetch market caps' });
  }
});

export default router;
