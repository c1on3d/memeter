import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Fetch real Solana price from CoinGecko
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const solana = data.solana;
        
        if (solana) {
          const networkStats = {
            price: solana.usd || 150,
            percentChange24h: solana.usd_24h_change || 0,
            volume24h: solana.usd_24h_vol || 1000000000,
            marketCap: solana.usd_market_cap || 87000000000,
            totalSupply: 580000000,
            circulatingSupply: 580000000,
            maxSupply: null,
            rank: 5,
            dominance: 5,
            timestamp: new Date().toISOString(),
            source: 'coingecko'
          };

          return res.status(200).json({
            success: true,
            ...networkStats,
          });
        }
      }
    } catch (error) {
      console.log('CoinGecko API failed, using fallback:', error);
    }

    // Fallback data if API fails
    const networkStats = {
      price: 150,
      percentChange24h: 0,
      volume24h: 1000000000,
      marketCap: 87000000000,
      totalSupply: 580000000,
      circulatingSupply: 580000000,
      maxSupply: null,
      rank: 5,
      dominance: 5,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    };

    res.status(200).json({
      success: true,
      ...networkStats,
      note: 'Using fallback Solana network data',
    });

  } catch (error) {
    console.error('Error in Solana network stats API:', error);
    
    // Return default stats on error
    res.status(200).json({
      success: true,
      price: 150,
      percentChange24h: 0,
      volume24h: 1000000000,
      marketCap: 87000000000,
      totalSupply: 580000000,
      circulatingSupply: 580000000,
      rank: 5,
      dominance: 5,
      timestamp: new Date().toISOString(),
      note: 'Using default Solana network data',
    });
  }
}
