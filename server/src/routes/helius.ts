import express from 'express';
import { heliusService } from '../services/heliusService.js';

const router = express.Router();

// Get token metadata from Helius
router.get('/api/helius/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const metadata = await heliusService.getTokenMetadata(mint);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    res.status(500).json({ error: 'Failed to fetch token metadata' });
  }
});

// Get token holders
router.get('/api/helius/holders/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const holders = await heliusService.getTokenHolders(mint);
    
    if (!holders) {
      return res.status(404).json({ error: 'Holders data not found' });
    }
    
    res.json(holders);
  } catch (error) {
    console.error('Error fetching token holders:', error);
    res.status(500).json({ error: 'Failed to fetch token holders' });
  }
});

// Get transaction details
router.get('/api/helius/transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const transaction = await heliusService.getTransaction(signature);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Get wallet tokens
router.get('/api/helius/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const tokens = await heliusService.getWalletTokens(address);
    
    if (!tokens) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching wallet tokens:', error);
    res.status(500).json({ error: 'Failed to fetch wallet tokens' });
  }
});

export default router;
