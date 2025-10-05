import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pumpPortalWebSocketService } from '../../server/services/pumpPortalWebSocketService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const limit = parseInt(req.query.limit as string) || 30;
    const newTokens = pumpPortalWebSocketService.getNewTokens(limit);
    
    // Transform data for frontend
    const transformedTokens = newTokens.map((token: any) => ({
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      price: token.price || 0,
      marketCap: token.marketCap || token.marketCapSol || 0,
      marketCapSol: token.marketCapSol || token.marketCap || 0,
      volume24h: token.volume24h || 0,
      change24h: Math.random() * 200 - 100, // Random for demo
      createdAt: token.createdAt,
      image: token.image,
      pool: token.pool || 'unknown',
      creator: token.creator,
    }));

    res.status(200).json({
      success: true,
      data: transformedTokens,
      total: newTokens.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching new tokens:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch new tokens',
      data: [] // Fallback to empty array
    });
  }
}
