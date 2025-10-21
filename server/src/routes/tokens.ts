import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get recent tokens
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        timestamp,
        website,
        twitter,
        telegram,
        discord,
        youtube,
        instagram,
        reddit,
        tiktok
      FROM tokens
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Convert marketCapSol from string to number
    const tokens = result.rows.map(row => ({
      ...row,
      marketCapSol: parseFloat(row.marketCapSol) || 0
    }));

    res.json(tokens);
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get token by mint address
router.get('/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;

    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        timestamp,
        website,
        twitter,
        telegram,
        discord,
        youtube,
        instagram,
        reddit,
        tiktok
      FROM tokens
      WHERE mint = $1`,
      [mint]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// Search tokens
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const result = await pool.query(
      `SELECT 
        mint,
        name,
        symbol,
        uri,
        image,
        description,
        creator,
        pool,
        market_cap_sol as "marketCapSol",
        timestamp,
        website,
        twitter,
        telegram,
        discord
      FROM tokens
      WHERE 
        mint = $1 OR
        LOWER(symbol) LIKE LOWER($2) OR
        LOWER(name) LIKE LOWER($2)
      ORDER BY timestamp DESC
      LIMIT $3`,
      [query, `%${query}%`, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching tokens:', error);
    res.status(500).json({ error: 'Failed to search tokens' });
  }
});

export default router;
