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

    // Try to fetch token metadata from Solana RPC
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
        if (data.result?.value?.data?.parsed?.info?.metadata?.image) {
          const imageUrl = data.result.value.data.parsed.info.metadata.image;
          
          return res.status(200).json({
            status: 'resolved',
            url: imageUrl,
            source: 'blockchain',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.log('Failed to fetch token image for address:', address, error);
    }

    // Fallback: return placeholder image
    res.status(200).json({
      status: 'placeholder',
      url: `https://via.placeholder.com/40x40/6366f1/ffffff?text=${address.slice(0, 2).toUpperCase()}`,
      source: 'placeholder',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in token image API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
