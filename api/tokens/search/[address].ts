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

    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Token address is required' });
    }

    // Try to fetch token data from Solana RPC
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [
            address,
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.value?.data?.parsed?.info) {
          const tokenInfo = data.result.value.data.parsed.info;
          
          const tokenData = {
            address: address,
            name: tokenInfo.metadata?.name || 'Unknown Token',
            symbol: tokenInfo.metadata?.symbol || 'UNK',
            decimals: tokenInfo.decimals || 6,
            supply: tokenInfo.supply || 0,
            image: tokenInfo.metadata?.image,
            description: tokenInfo.metadata?.description,
            source: 'blockchain',
            timestamp: new Date().toISOString()
          };

          return res.status(200).json({
            success: true,
            ...tokenData
          });
        }
      }
    } catch (error) {
      console.log('Solana RPC failed for address:', address, error);
    }

    // Fallback: return basic token info
    res.status(200).json({
      success: true,
      address: address,
      name: 'Token Not Found',
      symbol: 'UNK',
      message: 'Token data not available from blockchain',
      source: 'fallback',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in token search API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
