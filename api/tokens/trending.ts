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

    // Return empty trending data since we don't have real trending data source
    res.status(200).json({
      success: true,
      trending: [],
      total: 0,
      message: 'Trending data not available from public APIs',
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
