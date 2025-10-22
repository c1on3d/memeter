import express from 'express';
import { pool } from '../config/database.js';
import { heliusService } from '../services/heliusService.js';

const router = express.Router();

// Get recent tokens with market cap from database (updated by MarketCapUpdater)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        market_cap_usd as "marketCapUsd",
        price_usd as "priceUsd",
        volume_24h as "volume24h",
        price_change_24h as "priceChange24h",
        liquidity_usd as "liquidityUsd",
        pair_address as "pairAddress",
        timestamp,
        website,
        twitter,
        telegram,
        discord,
        youtube,
        instagram,
        reddit,
        tiktok
      FROM tokens
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Convert numeric fields from string to number
    const tokens = result.rows.map(row => ({
      ...row,
      marketCapSol: parseFloat(row.marketCapSol) || 0,
      marketCapUsd: parseFloat(row.marketCapUsd) || 0,
      priceUsd: parseFloat(row.priceUsd) || 0,
      volume24h: parseFloat(row.volume24h) || 0,
      priceChange24h: parseFloat(row.priceChange24h) || 0,
      liquidityUsd: parseFloat(row.liquidityUsd) || 0,
    }));

    res.json(tokens);
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get token by mint address
router.get('/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;

    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        market_cap_usd as "marketCapUsd",
        price_usd as "priceUsd",
        volume_24h as "volume24h",
        price_change_24h as "priceChange24h",
        liquidity_usd as "liquidityUsd",
        pair_address as "pairAddress",
        timestamp,
        website,
        twitter,
        telegram,
        discord,
        youtube,
        instagram,
        reddit,
        tiktok
      FROM tokens
      WHERE mint = $1`,
      [mint]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const token = {
      ...result.rows[0],
      marketCapSol: parseFloat(result.rows[0].marketCapSol) || 0,
      marketCapUsd: parseFloat(result.rows[0].marketCapUsd) || 0,
      priceUsd: parseFloat(result.rows[0].priceUsd) || 0,
      volume24h: parseFloat(result.rows[0].volume24h) || 0,
      priceChange24h: parseFloat(result.rows[0].priceChange24h) || 0,
      liquidityUsd: parseFloat(result.rows[0].liquidityUsd) || 0,
    };

    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// Search tokens (database + DexScreener)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Search in database first
    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        market_cap_usd as "marketCapUsd",
        price_usd as "priceUsd",
        timestamp,
        website,
        twitter,
        telegram,
        discord
      FROM tokens
      WHERE 
        mint = $1 OR
        LOWER(symbol) LIKE LOWER($2) OR
        LOWER(name) LIKE LOWER($2)
      ORDER BY timestamp DESC
      LIMIT $3`,
      [query, `%${query}%`, limit]
    );

    // Convert numeric fields from string to number
    const tokens = result.rows.map(row => ({
      ...row,
      marketCapSol: parseFloat(row.marketCapSol) || 0,
      marketCapUsd: parseFloat(row.marketCapUsd) || 0,
      priceUsd: parseFloat(row.priceUsd) || 0,
      source: 'database'
    }));

    // If searching by address and not found in DB, try Helius + DexScreener
    const isMintAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query.trim());
    if (isMintAddress && tokens.length === 0) {
      try {
        // Try Helius first for metadata
        const heliusData = await heliusService.getTokenMetadata(query);
        
        // Try DexScreener for price data
        let dexData = null;
        try {
          const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${query}`);
          if (dexResponse.ok) {
            const data: any = await dexResponse.json();
            dexData = data?.pairs?.[0];
          }
        } catch (e) {
          console.error('DexScreener search error:', e);
        }

        // Combine Helius metadata with DexScreener price
        if (heliusData || dexData) {
          // Get SOL price to convert market cap
          let marketCapSol = 0;
          if (dexData?.marketCap) {
            try {
              const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
              if (solPriceResponse.ok) {
                const solPriceData: any = await solPriceResponse.json();
                const solPrice = solPriceData?.solana?.usd || 185;
                marketCapSol = Number(dexData.marketCap) / solPrice;
              }
            } catch (e) {
              // Use default SOL price if fetch fails
              marketCapSol = Number(dexData.marketCap) / 185;
            }
          }
          
          tokens.push({
            mint: query,
            name: heliusData?.content?.metadata?.name || dexData?.baseToken?.name || 'Unknown',
            symbol: heliusData?.content?.metadata?.symbol || dexData?.baseToken?.symbol || 'UNKNOWN',
            image: heliusData?.content?.links?.image || heliusData?.content?.files?.[0]?.uri || null,
            description: heliusData?.content?.metadata?.description || null,
            uri: heliusData?.content?.json_uri || null,
            marketCapSol: marketCapSol,
            marketCapUsd: Number(dexData?.marketCap || 0),
            priceUsd: Number(dexData?.priceUsd || 0),
            source: heliusData ? 'helius' : 'dexscreener',
            pairAddress: dexData?.pairAddress,
            website: heliusData?.content?.links?.external_url,
            twitter: heliusData?.content?.links?.twitter,
          });
        }
      } catch (e) {
        console.error('Token search error:', e);
      }
    }

    res.json(tokens);
  } catch (error) {
    console.error('Error searching tokens:', error);
    res.status(500).json({ error: 'Failed to search tokens' });
  }
});

export default router;
