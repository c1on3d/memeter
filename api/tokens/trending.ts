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

    // Return demo trending tokens data
    const demoTrendingTokens = Array.from({ length: 20 }, (_, i) => ({
      id: `trending_${i + 1}`,
      mint: `trending_mint_${i + 1}`,
      name: `Trending Token ${i + 1}`,
      symbol: `TREND${i + 1}`,
      price: Math.random() * 0.1,
      change24h: Math.random() * 500 - 100, // -100% to +400%
      volume24h: Math.floor(Math.random() * 2000000) + 100000,
      marketCap: Math.floor(Math.random() * 5000000) + 500000,
      marketCapSol: Math.floor(Math.random() * 50000) + 5000,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(), // Last 30 days
      image: `https://picsum.photos/40/40?random=${i + 100}`,
      pool: Math.random() > 0.5 ? 'pump' : 'raydium',
      creator: 'Trending Creator',
      trendingScore: Math.floor(Math.random() * 100) + 1,
    }));

    // Sort by trending score (highest first)
    demoTrendingTokens.sort((a, b) => b.trendingScore - a.trendingScore);

    res.status(200).json({
      success: true,
      trending: demoTrendingTokens,
      total: demoTrendingTokens.length,
      note: 'Using demo trending data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in trending tokens API:', error);
    
    // Return empty trending data on error
    res.status(200).json({
      success: true,
      trending: [],
      total: 0,
      note: 'No trending data available',
      timestamp: new Date().toISOString()
    });
  }
}
