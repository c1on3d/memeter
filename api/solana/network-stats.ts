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

    // Return demo Solana network stats
    const basePrice = 150; // Base SOL price
    const priceVariation = Math.random() * 20 - 10; // ±10 variation
    const currentPrice = basePrice + priceVariation;
    
    const percentChange24h = Math.random() * 20 - 10; // ±10% change
    const volume24h = Math.floor(Math.random() * 1000000000) + 500000000; // 500M - 1.5B
    const marketCap = Math.floor(currentPrice * 580000000); // ~580M SOL supply

    const networkStats = {
      price: currentPrice,
      percentChange24h: percentChange24h,
      volume24h: volume24h,
      marketCap: marketCap,
      totalSupply: 580000000,
      circulatingSupply: 580000000,
      maxSupply: null,
      rank: 5,
      dominance: Math.random() * 5 + 3, // 3-8% market dominance
      timestamp: new Date().toISOString(),
      source: 'demo_data'
    };

    res.status(200).json({
      success: true,
      ...networkStats,
      note: 'Using demo Solana network data',
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
