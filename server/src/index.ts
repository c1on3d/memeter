import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import { PumpPortalService } from './services/pumpPortalService.js';
import tokensRouter from './routes/tokens.js';
import statsRouter from './routes/stats.js';
import imageProxyRouter from './routes/imageProxy.js';

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
    },
  });
});

app.use('/', tokensRouter);
app.use('/', statsRouter);
app.use('/', imageProxyRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function start() {
  try {
    console.log('🚀 Starting Memeter Backend...');
    
    // Initialize database
    await initializeDatabase();
    
    // Start PumpPortal WebSocket service
    const pumpPortalService = new PumpPortalService();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      pumpPortalService.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      pumpPortalService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
