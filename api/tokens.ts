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

    const limit = parseInt(req.query.limit as string) || 100;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    // Return demo tokens data
    const allDemoTokens = Array.from({ length: 1000 }, (_, i) => ({
      id: `token_${i + 1}`,
      mint: `token_mint_${i + 1}`,
      name: `Token ${i + 1}`,
      symbol: `TKN${i + 1}`,
      price: Math.random() * 0.01,
      change24h: Math.random() * 200 - 100,
      volume24h: Math.floor(Math.random() * 1000000) + 10000,
      marketCap: Math.floor(Math.random() * 500000) + 50000,
      marketCapSol: Math.floor(Math.random() * 5000) + 500,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 90).toISOString(), // Last 90 days
      image: `https://picsum.photos/40/40?random=${i + 200}`,
      pool: Math.random() > 0.7 ? 'pump' : Math.random() > 0.5 ? 'raydium' : 'unknown',
      creator: 'Token Creator',
      isActive: Math.random() > 0.3, // 70% active
      metrics: {
        volume24h: Math.floor(Math.random() * 1000000) + 10000,
        holders: Math.floor(Math.random() * 10000) + 100,
        transactions24h: Math.floor(Math.random() * 1000) + 50,
      }
    }));

    // Apply pagination
    const paginatedTokens = allDemoTokens.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      tokens: paginatedTokens,
      total: allDemoTokens.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(allDemoTokens.length / limit),
      note: 'Using demo token data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in tokens API:', error);
    
    // Return empty tokens data on error
    res.status(200).json({
      success: true,
      tokens: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
      note: 'No token data available',
      timestamp: new Date().toISOString()
    });
  }
}
