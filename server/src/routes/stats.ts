import express from 'express';
import { tokenStore } from '../services/tokenStore.js';

const router = express.Router();

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const totalTokens = tokenStore.getCount();
    const tokens = tokenStore.getRecentTokens(500);
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const last1h = tokens.filter(t => t.timestamp.getTime() > oneHourAgo).length;
    const last24h = tokens.filter(t => t.timestamp.getTime() > oneDayAgo).length;
    
    res.json({
      totalTokens,
      last24h,
      last1h,
      tokensPerHour: Math.round(last24h / 24),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  res.json({ status: 'healthy' });
});

export default router;
