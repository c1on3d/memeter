import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Try multiple PumpPortal endpoints to get real data
    const endpoints = [
      'https://frontend-api.pump.fun/coins?order=market_cap&limit=50',
      'https://api.pump.fun/v0/coins?limit=50',
      'https://pump.fun/api/coins?limit=50'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://pump.fun/'
          },
          timeout: 10000
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Success with endpoint: ${endpoint}`, data.length || 'No length property');
          
          return res.status(200).json({
            success: true,
            data: data,
            endpoint: endpoint,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`Failed with status ${response.status} for ${endpoint}`);
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}:`, error.message);
      }
    }

    // If all endpoints fail
    res.status(503).json({
      success: false,
      error: 'All PumpPortal endpoints failed',
      message: 'Unable to connect to PumpPortal API',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in stats API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
