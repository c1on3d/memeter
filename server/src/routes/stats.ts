import express from 'express';
import { databaseService } from '../services/databaseService.js';

const router = express.Router();

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total count
    const countResult = await databaseService.query('SELECT COUNT(*) as total FROM tokens');
    const totalTokens = parseInt(countResult.rows[0]?.total || '0');
    
    // Get counts for time periods
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const last1hResult = await databaseService.query(
      'SELECT COUNT(*) as count FROM tokens WHERE timestamp > $1',
      [oneHourAgo]
    );
    const last1h = parseInt(last1hResult.rows[0]?.count || '0');
    
    const last24hResult = await databaseService.query(
      'SELECT COUNT(*) as count FROM tokens WHERE timestamp > $1',
      [oneDayAgo]
    );
    const last24h = parseInt(last24hResult.rows[0]?.count || '0');
    
    res.json({
      totalTokens,
      last24h,
      last1h,
      tokensPerHour: Math.round(last24h / 24),
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    
    if (error.message?.includes('not connected')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  res.json({ status: 'healthy' });
});

export default router;
