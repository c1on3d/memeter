import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalTokens, last24h, last1h] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM tokens'),
      pool.query(
        `SELECT COUNT(*) as count FROM tokens 
         WHERE timestamp > NOW() - INTERVAL '24 hours'`
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM tokens 
         WHERE timestamp > NOW() - INTERVAL '1 hour'`
      ),
    ]);

    res.json({
      totalTokens: parseInt(totalTokens.rows[0].count),
      last24h: parseInt(last24h.rows[0].count),
      last1h: parseInt(last1h.rows[0].count),
      tokensPerHour: Math.round(parseInt(last24h.rows[0].count) / 24),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

export default router;
