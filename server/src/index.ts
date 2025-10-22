import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PumpApiService } from './services/pumpApiService.js';
import tokensRouter from './routes/tokens.js';
import statsRouter from './routes/stats.js';
import imageProxyRouter from './routes/imageProxy.js';
import heliusRouter from './routes/helius.js';
import priceRouter from './routes/price.js';
import marketcapRouter from './routes/marketcap.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Memeter API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      tokens: '/recent',
      search: '/search',
      stats: '/stats',
      health: '/health',
      imageProxy: '/api/image-proxy',
      helius: '/api/helius',
      price: '/api/price',
      marketcap: '/api/marketcap',
    },
  });
});

app.use('/', tokensRouter);
app.use('/', statsRouter);
app.use('/', imageProxyRouter);
app.use('/', heliusRouter);
app.use('/', priceRouter);
app.use('/', marketcapRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize PumpAPI service
const pumpApiService = new PumpApiService();

// Start server
app.listen(PORT, () => {
  console.log('🚀 Memeter Backend started');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  pumpApiService.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  pumpApiService.disconnect();
  process.exit(0);
});
