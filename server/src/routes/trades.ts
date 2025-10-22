import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Get recent trades for a specific token
router.get('/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(
      `SELECT 
        id,
        mint,
        tx_type as "txType",
        signature,
        trader,
        sol_amount as "solAmount",
        token_amount as "tokenAmount",
        price_sol as "priceSol",
        market_cap_sol as "marketCapSol",
        timestamp
      FROM trades
      WHERE mint = $1
      ORDER BY timestamp DESC
      LIMIT $2`,
      [mint, limit]
    );

    const trades = result.rows.map(row => ({
      ...row,
      solAmount: parseFloat(row.solAmount) || 0,
      tokenAmount: parseFloat(row.tokenAmount) || 0,
      priceSol: parseFloat(row.priceSol) || 0,
      marketCapSol: parseFloat(row.marketCapSol) || 0,
    }));

    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get recent trades across all tokens
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const result = await pool.query(
      `SELECT 
        t.id,
        t.mint,
        t.tx_type as "txType",
        t.signature,
        t.trader,
        t.sol_amount as "solAmount",
        t.token_amount as "tokenAmount",
        t.price_sol as "priceSol",
        t.market_cap_sol as "marketCapSol",
        t.timestamp,
        tok.symbol,
        tok.name,
        tok.image
      FROM trades t
      LEFT JOIN tokens tok ON t.mint = tok.mint
      ORDER BY t.timestamp DESC
      LIMIT $1`,
      [limit]
    );

    const trades = result.rows.map(row => ({
      ...row,
      solAmount: parseFloat(row.solAmount) || 0,
      tokenAmount: parseFloat(row.tokenAmount) || 0,
      priceSol: parseFloat(row.priceSol) || 0,
      marketCapSol: parseFloat(row.marketCapSol) || 0,
    }));

    res.json(trades);
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({ error: 'Failed to fetch recent trades' });
  }
});

// Get trades by wallet address
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(
      `SELECT 
        t.id,
        t.mint,
        t.tx_type as "txType",
        t.signature,
        t.trader,
        t.sol_amount as "solAmount",
        t.token_amount as "tokenAmount",
        t.price_sol as "priceSol",
        t.market_cap_sol as "marketCapSol",
        t.timestamp,
        tok.symbol,
        tok.name,
        tok.image
      FROM trades t
      LEFT JOIN tokens tok ON t.mint = tok.mint
      WHERE t.trader = $1
      ORDER BY t.timestamp DESC
      LIMIT $2`,
      [address, limit]
    );

    const trades = result.rows.map(row => ({
      ...row,
      solAmount: parseFloat(row.solAmount) || 0,
      tokenAmount: parseFloat(row.tokenAmount) || 0,
      priceSol: parseFloat(row.priceSol) || 0,
      marketCapSol: parseFloat(row.marketCapSol) || 0,
    }));

    res.json(trades);
  } catch (error) {
    console.error('Error fetching wallet trades:', error);
    res.status(500).json({ error: 'Failed to fetch wallet trades' });
  }
});

// Get trade statistics for a token
router.get('/stats/:mint', async (req, res) => {
  try {
    const { mint } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_trades,
        COUNT(CASE WHEN tx_type = 'buy' THEN 1 END) as buys,
        COUNT(CASE WHEN tx_type = 'sell' THEN 1 END) as sells,
        SUM(CASE WHEN tx_type = 'buy' THEN sol_amount ELSE 0 END) as total_buy_volume,
        SUM(CASE WHEN tx_type = 'sell' THEN sol_amount ELSE 0 END) as total_sell_volume,
        SUM(sol_amount) as total_volume,
        AVG(sol_amount) as avg_trade_size,
        MAX(sol_amount) as largest_trade,
        COUNT(DISTINCT trader) as unique_traders
      FROM trades
      WHERE mint = $1`,
      [mint]
    );

    const stats = {
      ...result.rows[0],
      totalTrades: parseInt(result.rows[0].total_trades) || 0,
      buys: parseInt(result.rows[0].buys) || 0,
      sells: parseInt(result.rows[0].sells) || 0,
      totalBuyVolume: parseFloat(result.rows[0].total_buy_volume) || 0,
      totalSellVolume: parseFloat(result.rows[0].total_sell_volume) || 0,
      totalVolume: parseFloat(result.rows[0].total_volume) || 0,
      avgTradeSize: parseFloat(result.rows[0].avg_trade_size) || 0,
      largestTrade: parseFloat(result.rows[0].largest_trade) || 0,
      uniqueTraders: parseInt(result.rows[0].unique_traders) || 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    res.status(500).json({ error: 'Failed to fetch trade stats' });
  }
});

export default router;
