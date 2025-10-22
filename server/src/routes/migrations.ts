import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get recently migrated tokens
router.get('/migrations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;

    // First, check our database for tokens that have migrated (tracked by PumpAPI/PumpPortal WebSocket)
    const dbResult = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        image,
        market_cap_sol as "marketCapSol",
        market_cap_usd as "marketCapUsd",
        price_usd as "priceUsd",
        raydium_pool as "raydiumPool",
        migrated_at as "migratedAt",
        website,
        twitter,
        telegram,
        discord,
        youtube,
        instagram,
        reddit,
        tiktok
      FROM tokens
      WHERE raydium_pool IS NOT NULL AND migrated_at IS NOT NULL
      ORDER BY migrated_at DESC
      LIMIT $1`,
      [limit]
    );

    if (dbResult.rows.length > 0) {
      const tokens = dbResult.rows.map(row => ({
        ...row,
        marketCapSol: parseFloat(row.marketCapSol) || 0,
        marketCapUsd: parseFloat(row.marketCapUsd) || 0,
        priceUsd: parseFloat(row.priceUsd) || 0,
        pool: 'pump',
        source: 'database',
      }));
      console.log(`✅ Returning ${tokens.length} migrated tokens from database (tracked by PumpAPI WebSocket)`);
      return res.json(tokens);
    }

    // Fallback: Fetch graduated tokens from PumpSwap API
    console.log('📊 No migrations in database, fetching from PumpSwap API...');
    
    // Get SOL price for conversion
    let solPrice = 185;
    try {
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (solPriceResponse.ok) {
        const solPriceData: any = await solPriceResponse.json();
        solPrice = solPriceData?.solana?.usd || 185;
      }
    } catch (e) {
      console.log('Using default SOL price');
    }

    // Try PumpSwap API first
    try {
      console.log('📊 Fetching graduated tokens from PumpSwap API...');
      const pumpSwapResponse = await fetch('https://api.pumpswap.io/tokens/graduated?limit=50');
      
      if (pumpSwapResponse.ok) {
        const pumpSwapData: any = await pumpSwapResponse.json();
        console.log(`📊 PumpSwap API response:`, {
          status: pumpSwapResponse.status,
          hasData: !!pumpSwapData,
          isArray: Array.isArray(pumpSwapData),
          length: pumpSwapData?.length || 0
        });

        if (pumpSwapData && pumpSwapData.length > 0) {
          const tokens = await processGraduatedTokens(pumpSwapData, limit, solPrice);
          console.log(`✅ Returning ${tokens.length} graduated tokens from PumpSwap`);
          return res.json(tokens);
        }
      } else {
        console.log('⚠️ PumpSwap API returned:', pumpSwapResponse.status);
      }
    } catch (e) {
      console.log('⚠️ PumpSwap API error:', e);
    }

    // Fallback to Pump.fun API
    console.log('📊 Falling back to Pump.fun API...');
    try {
      const pumpResponse = await fetch('https://frontend-api.pump.fun/coins/graduated?limit=50&offset=0&includeNsfw=false');
      
      console.log('📊 Pump.fun API response status:', pumpResponse.status);
      
      if (!pumpResponse.ok) {
        const errorText = await pumpResponse.text();
        console.error('❌ Pump.fun API error:', pumpResponse.status, errorText);
        return res.json([]);
      }

      const pumpData: any = await pumpResponse.json();
      console.log(`📊 Received data from Pump.fun:`, {
        isArray: Array.isArray(pumpData),
        length: pumpData?.length || 0,
        firstItem: pumpData?.[0] ? {
          mint: pumpData[0].mint,
          name: pumpData[0].name,
          symbol: pumpData[0].symbol
        } : null
      });

      if (!pumpData || pumpData.length === 0) {
        console.log('⚠️ No graduated tokens found in response');
        return res.json([]);
      }

      const tokens = await processGraduatedTokens(pumpData, limit, solPrice);
      console.log(`✅ Returning ${tokens.length} graduated tokens from Pump.fun`);
      return res.json(tokens);
    } catch (e) {
      console.error('❌ Error fetching graduated tokens:', e);
      return res.json([]);
    }
  } catch (error) {
    console.error('❌ Error fetching migrations:', error);
    res.status(500).json({ error: 'Failed to fetch migrations' });
  }
});

// Helper function to process graduated tokens data
async function processGraduatedTokens(tokensData: any[], limit: number, solPrice: number) {
  // Get token mints to fetch DexScreener data for current prices
  const tokenMints = tokensData
    .slice(0, limit)
    .map((token: any) => token?.mint)
    .filter(Boolean);

  if (tokenMints.length === 0) {
    return [];
  }

  // Fetch DexScreener data for these tokens
  let dexPairs: any = {};
  try {
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMints.join(',')}`);
    if (dexResponse.ok) {
      const dexData: any = await dexResponse.json();
      // Map pairs by token mint (prefer highest liquidity)
      (dexData?.pairs || []).forEach((pair: any) => {
        const mint = pair?.baseToken?.address;
        if (mint && (!dexPairs[mint] || Number(pair?.liquidity?.usd || 0) > Number(dexPairs[mint]?.liquidity?.usd || 0))) {
          dexPairs[mint] = pair;
        }
      });
      console.log(`📊 Fetched DexScreener data for ${Object.keys(dexPairs).length} tokens`);
    }
  } catch (e) {
    console.log('Could not fetch DexScreener data:', e);
  }

  const tokens = tokensData.slice(0, limit).map((token: any) => {
    const pair = dexPairs[token.mint];
    const marketCapUsd = pair ? Number(pair.marketCap || 0) : (token.usd_market_cap || 0);
    
    return {
      mint: token.mint,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'UNKNOWN',
      image: token.image_uri ? `https://cf-ipfs.com/ipfs/${token.image_uri}` : null,
      marketCapSol: marketCapUsd / solPrice,
      marketCapUsd: marketCapUsd,
      priceUsd: pair ? Number(pair.priceUsd || 0) : 0,
      raydiumPool: pair?.pairAddress || token.raydium_pool,
      migratedAt: token.complete_timestamp ? new Date(token.complete_timestamp * 1000) : new Date(),
      pool: 'pump',
      liquidity: pair ? Number(pair.liquidity?.usd || 0) : 0,
      volume24h: pair ? Number(pair.volume?.h24 || 0) : 0,
      priceChange24h: pair ? Number(pair.priceChange?.h24 || 0) : 0,
      // Social links
      website: token.website || null,
      twitter: token.twitter || null,
      telegram: token.telegram || null,
      discord: null,
      source: 'pump',
    };
  });

  return tokens;
}

export default router;
