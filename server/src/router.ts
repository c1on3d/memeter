import express, { type Router, type Request, type Response } from 'express';
import type { AppConfig } from './config/appConfig';
import type { DatabaseService } from './database/service';
import type { PumpPortalService } from './services/pumpPortalService';

interface MemeterBackendOptions {
  config: AppConfig;
  databaseService: DatabaseService | null;
  pumpPortalService: PumpPortalService | null;
  getInMemory: () => {
    recentTokens: any[];
    recentMigrations: any[];
  };
}

export function createMemeterBackend(options: MemeterBackendOptions): Router {
  const router = express.Router();
  const { config, databaseService, pumpPortalService, getInMemory } = options;

  // Health check endpoint
  router.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      pumpPortal: pumpPortalService?.isConnected() ? 'connected' : 'disconnected',
      database: databaseService ? 'enabled' : 'disabled',
    });
  });

  // Get new tokens endpoint
  router.get('/api/new', (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 10;
      const { recentTokens } = getInMemory();
      
      const tokens = recentTokens.slice(0, limit);
      
      res.json({
        message: 'Recent token data from WebSocket',
        tokens: tokens.map(token => ({
          timestamp: token.createdAt,
          source: 'pumpportal',
          mint: token.mint,
          name: token.name,
          symbol: token.symbol,
          marketCapSol: token.marketCapSol,
          image: token.image,
          uri: token.uri,
          pool: token.pool || 'pump',
          creator: token.creator,
          website: token.website,
          twitter: token.twitter,
          telegram: token.telegram,
          discord: token.discord,
          youtube: token.youtube,
          instagram: token.instagram,
          reddit: token.reddit,
          tiktok: token.tiktok,
        })),
        count: recentTokens.length,
      });
    } catch (error) {
      console.error('Error in /api/new endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch new tokens' });
    }
  });

  // Get all tokens
  router.get('/api/tokens', async (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 100;
      const { recentTokens } = getInMemory();
      
      res.json({
        tokens: recentTokens.slice(0, limit),
        total: recentTokens.length,
        message: 'In-memory storage',
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });


  // Get recent migrations
  router.get('/api/migrations/recent', async (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 20;
      const { recentMigrations, recentTokens } = getInMemory();
      
      const migrations = recentMigrations.slice(0, limit);
      
      const data = migrations.map(m => {
        const t = recentTokens.find(rt => rt.mint === m.tokenMint);
        return {
          mint: m.tokenMint,
          name: m.tokenName,
          symbol: m.tokenSymbol,
          migrationTime: m.migrationTime,
          marketCapAtMigration: m.marketCapAtMigration,
          volumeAtMigration: m.volumeAtMigration,
          image: t?.image || null,
        };
      });

      res.json({ count: data.length, migrations: data });
    } catch (error) {
      console.error('Error fetching migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations' });
    }
  });

  // PumpPortal endpoints
  router.get('/api/pumpportal/new-tokens', (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 10;
      const { recentTokens } = getInMemory();
      
      const tokens = recentTokens.slice(0, limit);
      
      res.json({
        success: true,
        data: tokens.map(token => ({
          mint: token.mint,
          name: token.name || 'Unknown Token',
          symbol: token.symbol || 'UNK',
          price: token.price || 0,
          marketCap: token.marketCapSol || token.marketCap || 0,
          marketCapSol: token.marketCapSol || token.marketCap || 0,
          volume24h: token.volume24h || 0,
          createdAt: token.createdAt,
          image: token.image,
          pool: token.pool || 'unknown',
          creator: token.creator,
          website: token.website,
          twitter: token.twitter,
          telegram: token.telegram,
          discord: token.discord,
          youtube: token.youtube,
          instagram: token.instagram,
          reddit: token.reddit,
          tiktok: token.tiktok,
        })),
        stats: {
          total: recentTokens.length,
          isConnected: pumpPortalService?.isConnected() || false,
        },
      });
    } catch (error) {
      console.error('Error fetching new tokens:', error);
      res.status(500).json({ error: 'Failed to fetch new tokens' });
    }
  });

  router.get('/api/pumpportal/migrations', (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 20;
      const { recentMigrations, recentTokens } = getInMemory();
      
      const migrations = recentMigrations.slice(0, limit);
      
      const data = migrations.map(m => {
        const t = recentTokens.find(rt => rt.mint === m.tokenMint);
        return {
          mint: m.tokenMint,
          name: m.tokenName,
          symbol: m.tokenSymbol,
          migrationTime: m.migrationTime,
          marketCapAtMigration: m.marketCapAtMigration,
          volumeAtMigration: m.volumeAtMigration,
          image: t?.image || null,
        };
      });

      res.json({
        success: true,
        data,
        stats: {
          total: recentMigrations.length,
          isConnected: pumpPortalService?.isConnected() || false,
        },
      });
    } catch (error) {
      console.error('Error fetching migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations' });
    }
  });

  router.get('/api/pumpportal/stats', (_req: Request, res: Response) => {
    try {
      const { recentTokens, recentMigrations } = getInMemory();
      
      res.json({
        success: true,
        data: {
          totalTokens: recentTokens.length,
          totalMigrations: recentMigrations.length,
          isConnected: pumpPortalService?.isConnected() || false,
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Image proxy endpoint with IPFS gateway fallbacks
  router.get('/api/image-proxy', async (_req: Request, res: Response) => {
    try {
      let imageUrl = _req.query.url as string;
      
      if (!imageUrl) {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      // IPFS gateways to try in order (most reliable first)
      const ipfsGateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://dweb.link/ipfs/',
        'https://gateway.ipfs.io/ipfs/',
      ];

      // Extract IPFS hash if it's an IPFS URL
      let ipfsHash: string | null = null;
      if (imageUrl.includes('ipfs.io/ipfs/') || imageUrl.includes('gateway.ipfs.io/ipfs/')) {
        const match = imageUrl.match(/\/ipfs\/([^/?]+)/);
        if (match) {
          ipfsHash = match[1];
        }
      }

      // Try multiple gateways for IPFS URLs
      const urlsToTry = ipfsHash 
        ? ipfsGateways.map(gateway => gateway + ipfsHash)
        : [imageUrl];

      let lastError: any = null;
      
      for (const url of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per attempt

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/*,*/*',
            },
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const imageBuffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type') || 'image/png';

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
            
            return res.send(Buffer.from(imageBuffer));
          }
          
          lastError = new Error(`HTTP ${response.status}`);
        } catch (error: any) {
          lastError = error;
          // Continue to next gateway
          if (error.name === 'AbortError') {
            console.warn(`Timeout fetching image from ${url}`);
          } else {
            console.warn(`Failed to fetch from ${url}:`, error.message);
          }
        }
      }

      // All attempts failed
      console.error('All image proxy attempts failed for:', imageUrl, lastError);
      return res.status(404).json({ error: 'Failed to fetch image from all sources' });
      
    } catch (error) {
      console.error('Error in image proxy:', error);
      res.status(500).json({ error: 'Internal proxy error' });
    }
  });

  // Debug endpoint
  router.get('/api/debug/pumpportal', (_req: Request, res: Response) => {
    try {
      const { recentTokens, recentMigrations } = getInMemory();
      
      res.json({
        success: true,
        stats: {
          totalTokens: recentTokens.length,
          totalMigrations: recentMigrations.length,
          isConnected: pumpPortalService?.isConnected() || false,
        },
        sampleTokens: recentTokens.slice(0, 5),
        config: {
          features: config.features,
          nodeEnv: config.nodeEnv,
        },
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ error: 'Failed to get debug info' });
    }
  });

  // DexScreener endpoints - proxy to public API
  router.get('/api/dexscreener/trending/solana', async (_req: Request, res: Response) => {
    try {
      let pairs: any[] = [];
      
      // Method 1: Try trending boosted tokens (premium trending)
      try {
        console.log('🔥 Fetching DexScreener trending tokens (24h boosted)...');
        const response = await fetch('https://api.dexscreener.com/orders/v1/solana?sort=trendingScoreH24&order=desc&limit=30');
        
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && data.length > 0) {
            console.log(`✅ Found ${data.length} boosted trending tokens`);
            pairs = data.map((item: any, index: number) => ({
              mint: item.tokenAddress || item.pairAddress,
              name: item.name || item.symbol || 'Unknown',
              symbol: item.symbol || 'UNK',
              image: item.imageUrl || item.icon || null,
              marketCapSol: 0,
              marketCap: 0,
              pool: 'dex',
              creator: '',
              volume24h: 0,
              pairAddress: item.pairAddress || item.tokenAddress,
              priceChange: { h1: 0, h6: 0, h24: 0 },
              volume: { h1: 0, h6: 0, h24: 0 },
              trendingScoreH6: 100 - index,
              trendingScoreH24: 100 - index,
            }));
          }
        }
      } catch (e: any) {
        console.warn('Boosted trending fetch failed:', e?.message);
      }
      
      // Method 2: Search for high-volume Solana tokens
      if (pairs.length === 0) {
        try {
          console.log('🔍 Fetching high-volume Solana tokens...');
          const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL');
          
          if (response.ok) {
            const data = await response.json();
            if (data?.pairs && Array.isArray(data.pairs)) {
              pairs = data.pairs
                .filter((p: any) => {
                  return p?.chainId === 'solana' &&
                         p?.baseToken?.address && 
                         p?.baseToken?.symbol && 
                         (p?.volume?.h24 > 10000 || p?.priceChange?.h24 !== 0); // Active trading
                })
                .sort((a: any, b: any) => {
                  // Sort by 24h volume
                  const volA = a?.volume?.h24 || 0;
                  const volB = b?.volume?.h24 || 0;
                  return volB - volA;
                })
                .slice(0, 30)
                .map((p: any) => ({
                  mint: p.baseToken?.address || p.pairAddress,
                  name: p.baseToken?.name || p.baseToken?.symbol,
                  symbol: p.baseToken?.symbol || 'UNK',
                  image: p.info?.imageUrl || null,
                  marketCapSol: (p.marketCap || p.fdv || 0) / 100,
                  marketCap: p.marketCap || p.fdv || 0,
                  pool: 'dex',
                  creator: '',
                  priceChange: {
                    h1: p?.priceChange?.h1 || 0,
                    h6: p?.priceChange?.h6 || 0,
                    h24: p?.priceChange?.h24 || 0,
                  },
                  volume: {
                    h1: p?.volume?.h1 || 0,
                    h6: p?.volume?.h6 || 0,
                    h24: p?.volume?.h24 || 0,
                  },
                  volume24h: p?.volume?.h24 || 0,
                  trendingScoreH6: p?.trendingScoreH6 || 0,
                  trendingScoreH24: p?.trendingScoreH24 || 0,
                  pairAddress: p.pairAddress,
                }));
              
              console.log(`✅ Found ${pairs.length} high-volume Solana tokens`);
            }
          }
        } catch (e: any) {
          console.warn('Search fetch failed:', e?.message);
        }
      }
      
      // Method 3: Fallback to token profiles if all else fails
      if (pairs.length === 0) {
        try {
          console.log('🔍 Fallback: Trying token profiles...');
          const profileRes = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (Array.isArray(profileData)) {
              pairs = profileData
                .filter((item: any) => item.chainId === 'solana')
                .slice(0, 30)
                .map((item: any, index: number) => {
                  const pairAddress = item.url?.split('/').pop() || '';
                  return {
                    mint: item.tokenAddress || pairAddress,
                    name: item.description || 'Unknown Token',
                    symbol: item.url?.split('/').pop() || 'UNK',
                    image: item.icon,
                    marketCapSol: 0,
                    marketCap: 0,
                    pool: 'dex',
                    creator: '',
                    volume24h: 0,
                    pairAddress,
                    priceChange: { h1: 0, h6: 0, h24: 0 },
                    volume: { h1: 0, h6: 0, h24: 0 },
                    trendingScoreH6: 100 - index,
                    trendingScoreH24: 100 - index,
                  };
                });
              console.log(`✅ Token profiles: ${pairs.length} tokens`);
            }
          }
        } catch (e: any) {
          console.warn('Token profiles fetch failed:', e?.message);
        }
      }
      
      console.log(`📊 Returning ${pairs.length} trending tokens`);
      res.json({ tokens: pairs });
    } catch (error) {
      console.error('❌ Error fetching trending:', error);
      res.json({ tokens: [] });
    }
  });

  router.get('/api/dexscreener/token/:address', async (_req: Request, res: Response) => {
    try {
      const address = _req.params.address;
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener API returned ${response.status}`);
      }
      
      const data = await response.json();
      res.json({ data });
    } catch (error) {
      console.error('Error fetching DexScreener token:', error);
      res.status(500).json({ error: 'Failed to fetch token data' });
    }
  });

  router.get('/api/dexscreener/search/solana', async (_req: Request, res: Response) => {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana');
      
      if (!response.ok) {
        throw new Error(`DexScreener API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter for Solana pairs only
      let pairs = Array.isArray(data?.pairs) ? data.pairs : [];
      pairs = pairs.filter((p: any) => 
        (p?.chainId || p?.chain || '').toString().toLowerCase() === 'solana'
      );
      
      res.json({ pairs });
    } catch (error) {
      console.error('Error searching DexScreener:', error);
      res.status(500).json({ error: 'Failed to search tokens' });
    }
  });

  // Solana price endpoint
  router.get('/api/solana/price', async (_req: Request, res: Response) => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
      
      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      res.json({
        price: data.solana?.usd || 0,
        priceChange24h: data.solana?.usd_24h_change || 0,
      });
    } catch (error) {
      console.error('Error fetching Solana price:', error);
      res.status(500).json({ error: 'Failed to fetch Solana price' });
    }
  });

  return router;
}

export default createMemeterBackend;

