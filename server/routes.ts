import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { tokens, tokenMetrics } from '@shared/schema';
import { db } from './db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { pumpPortalWebSocketService } from './services/pumpPortalWebSocketService';

export function setupRoutes(app: Express): Server {
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Health check endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: db ? 'connected' : 'unavailable'
      }
    });
  });

  // Get tokens with pagination and filtering
  app.get('/api/tokens', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const riskLevel = req.query.riskLevel as string;
      const minHolders = parseInt(req.query.minHolders as string) || 0;

      // If database is not available, return empty array
      if (!db) {
        return res.json({
          tokens: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          message: 'Database not available'
        });
      }

      // Database query logic
      let whereConditions = [];
      
      if (search) {
        whereConditions.push(sql`${tokens.name} ILIKE ${`%${search}%`} OR ${tokens.symbol} ILIKE ${`%${search}%`} OR ${tokens.address} ILIKE ${`%${search}%`}`);
      }
      
      if (riskLevel) {
        whereConditions.push(sql`${tokenMetrics.riskScore} >= ${parseInt(riskLevel)}`);
      }
      
      if (minHolders > 0) {
        whereConditions.push(sql`${tokenMetrics.holderCount} >= ${minHolders}`);
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [tokensResult, countResult] = await Promise.all([
        db
          .select({
            token: tokens,
            metrics: tokenMetrics,
          })
          .from(tokens)
          .leftJoin(tokenMetrics, eq(tokens.id, tokenMetrics.tokenId))
          .where(whereClause)
          .orderBy(desc(tokens.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(tokens)
          .where(whereClause)
      ]);

      const total = countResult[0]?.count || 0;

      const tokensWithMetrics = tokensResult.map((result: any) => ({
        ...result.token,
        metrics: result.metrics || {
          marketCap: '0',
          volume24h: '0',
          holderCount: 0,
          riskScore: 5,
          priceChange24h: '0',
          liquidityUsd: '0'
        }
      }));

      res.json({
        tokens: tokensWithMetrics,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });

  // Get recent migrations
  app.get('/api/migrations/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // If database is not available, return empty array
      if (!db) {
        return res.json({ migrations: [] });
      }
      
      const migrations = await storage.getRecentMigrations(limit);
      
      res.json({ migrations });
    } catch (error) {
      console.error('Error fetching migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations' });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/recent-tokens', async (req, res) => {
    try {
      // If database is not available, return 0
      if (!db) {
        return res.json({ recentTokens: 0 });
      }

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tokens)
        .where(gte(tokens.createdAt, twentyFourHoursAgo));

      const count = result?.count || 0;
      console.log(`Recent tokens count (24h): ${count}`);
      
      res.json({ recentTokens: count });
    } catch (error) {
      console.error('Recent tokens analytics error:', error);
      res.status(500).json({ error: 'Failed to get recent tokens count' });
    }
  });

  app.get('/api/analytics/total-tokens', async (req, res) => {
    try {
      // If database is not available, return fallback count
      if (!db) {
        return res.json({ totalTokens: 0 });
      }

      const result = await db
        .select({
          totalCount: sql<number>`count(*)::int`
        })
        .from(tokens);

      const count = result[0]?.totalCount || 0;
      console.log(`Total tokens count (all time): ${count}`);
      
      res.json({ totalTokens: count });
    } catch (error) {
      console.error('Total tokens analytics error:', error);
      res.status(500).json({ error: 'Failed to get total tokens count' });
    }
  });

  app.get('/api/analytics/tokens-ready-to-migrate', async (req, res) => {
    try {
      console.log('🎯 Finding tokens ready to migrate...');
      
      // Return empty arrays since we don't have external data
      res.json({
        tokensReadyToMigrate: [],
        tokensNearThreshold: [],
        threshold: 800000,
        source: 'no_external_apis'
      });
    } catch (error) {
      console.error('Error finding tokens ready to migrate:', error);
      res.status(500).json({ error: 'Failed to find tokens ready to migrate' });
    }
  });

  app.get('/api/analytics/migration-threshold', async (req, res) => {
    try {
      console.log('🎯 Calculating migration threshold...');
      
      // Use standard migration threshold
      const thresholdSOL = 412;
      const confidence = 0.95;
      
      console.log(`💰 Migration threshold: ${thresholdSOL} SOL`);
      
      res.json({
        thresholdSOL,
        confidence,
        source: 'standard_threshold',
        description: 'Standard migration threshold'
      });
    } catch (error) {
      console.error('Error calculating migration threshold:', error);
      res.status(500).json({ error: 'Failed to calculate migration threshold' });
    }
  });

  app.get('/api/analytics/solana-network', async (req, res) => {
    try {
      console.log('📊 Using fallback Solana network statistics...');
      
      // Fallback Solana network stats
      const networkStats = {
        volume24h: 1500000000, // $1.5B
        marketCap: 45000000000, // $45B
        activeAddresses: 850000,
        transactions24h: 25000000,
        tps: 3000
      };
      
      console.log('✅ Solana network stats fetched:', { 
        volume24h: `$${(networkStats.volume24h / 1000000000).toFixed(1)}B`,
        marketCap: `$${(networkStats.marketCap / 1000000000).toFixed(0)}B`
      });
      
      res.json({
        ...networkStats,
        formatted: {
          volume24h: `$${(networkStats.volume24h / 1000000000).toFixed(1)}B`,
          marketCap: `$${(networkStats.marketCap / 1000000000).toFixed(0)}B`,
          activeAddresses: networkStats.activeAddresses.toLocaleString(),
          transactions24h: networkStats.transactions24h.toLocaleString(),
          tps: networkStats.tps.toLocaleString()
        },
        source: 'fallback_data'
      });
    } catch (error) {
      console.error('Error fetching Solana network stats:', error);
      res.status(500).json({ error: 'Failed to fetch Solana network stats' });
    }
  });

  // Token search endpoint
  app.get('/api/tokens/search/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
      }

      // Try to find token by address in database
      if (db) {
        const [token] = await db
          .select()
          .from(tokens)
          .where(eq(tokens.address, address))
          .limit(1);

        if (token) {
          return res.json({ token });
        }
      }

      res.status(404).json({ error: 'Token not found' });
    } catch (error) {
      console.error('Error searching for token:', error);
      res.status(500).json({ error: 'Failed to search for token' });
    }
  });

  // Token image endpoint
  app.get('/api/tokens/:address/image', async (req, res) => {
    try {
      const { address } = req.params;
      
      // Fallback to default image
      res.redirect('/placeholder-token.png');
    } catch (error) {
      console.error('Error fetching token image:', error);
      res.status(500).json({ error: 'Failed to fetch token image' });
    }
  });

  // Token image JSON endpoint
  app.get('/api/tokens/:address/image.json', async (req, res) => {
    try {
      const { address } = req.params;
      
      // Fallback
      res.json({ 
        image: '/placeholder-token.png',
        source: 'fallback'
      });
    } catch (error) {
      console.error('Error fetching token image JSON:', error);
      res.status(500).json({ error: 'Failed to fetch token image' });
    }
  });

  // PumpPortal Live Data Endpoints
  app.get('/api/pumpportal/new-tokens', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const newTokens = pumpPortalWebSocketService.getNewTokens(limit);
      
      // Transform the data to match frontend expectations
      const transformedTokens = newTokens.map(token => ({
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
      }));
      
      res.json({
        success: true,
        data: transformedTokens,
        stats: {
          total: pumpPortalWebSocketService.getStats().totalTokens,
          isConnected: pumpPortalWebSocketService.isConnected(),
        }
      });
    } catch (error) {
      console.error('Error fetching new tokens:', error);
      res.status(500).json({ error: 'Failed to fetch new tokens' });
    }
  });

  app.get('/api/pumpportal/migrations', (req, res) => {
    try {
      res.json({
        success: true,
        data: [],
        stats: {
          total: 0,
          isConnected: false,
        }
      });
    } catch (error) {
      console.error('Error fetching migrations:', error);
      res.status(500).json({ error: 'Failed to fetch migrations' });
    }
  });

  app.get('/api/pumpportal/trades', (req, res) => {
    try {
      res.json({
        success: true,
        data: [],
        stats: {
          total: 0,
          isConnected: false,
        }
      });
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  app.get('/api/pumpportal/stats', (req, res) => {
    try {
      const stats = pumpPortalWebSocketService.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // New endpoint: /api/new - Returns tokens with images already fetched (no CORS!)
  app.get('/api/new', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokens = pumpPortalWebSocketService.getNewTokens(limit);
      
      res.json({
        message: "Recent token data from WebSocket",
        tokens: tokens.map(token => ({
          timestamp: token.createdAt,
          source: 'pumpportal',
          mint: token.mint,
          name: token.name,
          symbol: token.symbol,
          marketCapSol: token.marketCapSol,
          image: token.image, // Images already fetched by backend!
          uri: token.uri,
          pool: token.pool || 'pump',
          creator: token.creator,
        })),
        count: pumpPortalWebSocketService.getStats().totalTokens
      });
    } catch (error) {
      console.error('Error in /api/new endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch new tokens' });
    }
  });

  // Image proxy endpoint - Fetches images server-side to avoid CORS
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      
      if (!imageUrl) {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      // Fetch image from IPFS/metadata server
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }

      // Get the image data
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';

      // Set CORS headers to allow frontend access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      res.send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error('Error proxying image:', error);
      res.status(500).json({ error: 'Failed to proxy image' });
    }
  });

  // Debug endpoint to check WebSocket service status
  app.get('/api/debug/pumpportal', (req, res) => {
    try {
      const stats = pumpPortalWebSocketService.getStats();
      const newTokens = pumpPortalWebSocketService.getNewTokens(5);
      
      res.json({
        success: true,
        stats,
        sampleTokens: newTokens,
        isConnected: pumpPortalWebSocketService.isConnected()
      });
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ error: 'Failed to get debug info' });
    }
  });

  return server;
}