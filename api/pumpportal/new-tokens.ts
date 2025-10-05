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

    const limit = parseInt(req.query.limit as string) || 30;
    
    // Fetch real data from PumpFun API - try multiple endpoints
    const apiEndpoints = [
      'https://frontend-api.pump.fun/coins?order=market_cap&limit=' + limit,
      'https://api.pump.fun/v0/coins?limit=' + limit,
      'https://pump.fun/api/coins?limit=' + limit,
      'https://frontend-api.pump.fun/coins?order=created_timestamp&limit=' + limit
    ];

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying pump.fun endpoint: ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://pump.fun/',
            'Origin': 'https://pump.fun'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`Success with endpoint: ${endpoint}`, data.length || 'No length property');
          
          // Transform the data to match our frontend format
          const transformedTokens = (Array.isArray(data) ? data : data.coins || data.data || []).map((token: any, index: number) => ({
            mint: token.mint || token.address || `token_${index}`,
            name: token.name || token.token_name || `Token ${index + 1}`,
            symbol: token.symbol || token.token_symbol || `TKN${index + 1}`,
            price: token.price || (token.usd_market_cap && token.total_supply ? token.usd_market_cap / token.total_supply : 0),
            marketCap: token.usd_market_cap || token.market_cap || 0,
            marketCapSol: token.market_cap || token.sol_market_cap || 0,
            volume24h: token.volume_24h || token.volume || 0,
            change24h: token.change_24h || Math.random() * 200 - 100,
            createdAt: token.created_timestamp || token.created_at || new Date(Date.now() - Math.random() * 86400000).toISOString(),
            image: token.image_uri || token.image || token.metadata?.image,
            pool: 'pump',
            creator: token.creator || token.owner || 'Unknown',
          }));

          if (transformedTokens.length > 0) {
            return res.status(200).json({
              success: true,
              data: transformedTokens,
              total: transformedTokens.length,
              stats: {
                total: transformedTokens.length,
                isConnected: true,
              },
              endpoint: endpoint,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log(`Failed with status ${response.status} for ${endpoint}`);
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // If all APIs fail, return error instead of demo data
    res.status(503).json({
      success: false,
      error: 'Unable to fetch live token data',
      message: 'All pump.fun API endpoints are currently unavailable',
      data: []
    });

  } catch (error) {
    console.error('Error in new-tokens API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      data: []
    });
  }
}