import express from 'express';
import { databaseService } from '../services/databaseService.js';

const router = express.Router();

// Get recent tokens
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tokens = await databaseService.getRecentTokens(limit);
    
    res.json(tokens);
  } catch (error: any) {
    console.error('Error fetching recent tokens:', error);
    
    // Return appropriate status code based on error type
    if (error.message?.includes('not connected')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Search tokens
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!query) {
      return res.json([]);
    }
    
    const tokens = await databaseService.searchTokens(query, limit);
    res.json(tokens);
  } catch (error: any) {
    console.error('Error searching tokens:', error);
    
    if (error.message?.includes('not connected')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    res.status(500).json({ error: 'Failed to search tokens' });
  }
});

// Get token by mint
router.get('/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const token = await databaseService.getTokenByMint(mint);
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json(token);
  } catch (error: any) {
    console.error('Error fetching token:', error);
    
    if (error.message?.includes('not connected')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

export default router;
