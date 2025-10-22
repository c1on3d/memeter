import express from 'express';
import { tokenStore } from '../services/tokenStore.js';

const router = express.Router();

// Get recent tokens
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tokens = tokenStore.getRecentTokens(limit);
    
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
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
    
    const tokens = tokenStore.searchTokens(query, limit);
    res.json(tokens);
  } catch (error) {
    console.error('Error searching tokens:', error);
    res.status(500).json({ error: 'Failed to search tokens' });
  }
});

// Get token by mint
router.get('/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const token = tokenStore.getToken(mint);
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

export default router;
