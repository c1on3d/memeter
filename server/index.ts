import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { getConfig } from "./src/config/appConfig";
import { DatabaseService } from "./src/database/service";
import { PumpPortalService } from "./src/services/pumpPortalService";
import { createMemeterBackend } from "./src/router";

// Note: Do NOT disable TLS certificate validation. Keep secure defaults.

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: true, // Allow ALL origins - enables Vercel, localhost, and any domain
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Raw body capture middleware for webhook HMAC verification
app.use('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req: any, res, next) => {
  // Store the raw body for HMAC verification
  req.rawBody = req.body;
  // Convert back to string for easier handling
  req.body = req.body.toString('utf8');
  next();
});

// JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Get configuration
  const config = getConfig();
  console.log('📋 Configuration loaded:', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    features: config.features,
  });

  // Initialize in-memory storage
  let recentTokens: any[] = [];
  let recentBNBTokens: any[] = [];
  // BitQuery removed
  let recentMigrations: any[] = [];

  // Initialize database service if enabled
  let databaseService: DatabaseService | null = null;
  if (config.features.database && config.database) {
    console.log('🗄️  Initializing database service...');
    databaseService = new DatabaseService(config.database);
    try {
      await databaseService.initialize();
    } catch (error) {
      console.warn('⚠️  Database unavailable, continuing without it:', error instanceof Error ? error.message : error);
      databaseService = null;
    }
  } else {
    console.log('📝 Database disabled, using in-memory storage only');
  }

  // Initialize PumpPortal service if enabled
  let pumpPortalService: PumpPortalService | null = null;
  if (config.features.pumpPortal) {
    console.log('🔌 Starting PumpPortal WebSocket service...');
    pumpPortalService = new PumpPortalService({
      publicBaseUrl: config.publicBaseUrl,
      databaseService,
      onToken: (token) => {
        const idx = recentTokens.findIndex(x => x.mint === token.mint);
        if (idx !== -1) {
          recentTokens[idx] = token;
        } else {
          recentTokens.push(token);
        }
        // Keep only latest 1000 tokens
        if (recentTokens.length > 1000) {
          recentTokens.shift();
        }
      },
      onMigration: (migration) => {
        const exists = recentMigrations.findIndex(x => x.tokenMint === migration.tokenMint);
        if (exists === -1) {
          recentMigrations.unshift(migration);
          // Keep only latest 100 migrations
          if (recentMigrations.length > 100) {
            recentMigrations = recentMigrations.slice(0, 100);
          }
        }
      },
    });
    pumpPortalService.start();
  } else {
    console.log('⏸️  PumpPortal service disabled');
  }

  // BitQuery removed

  // Mount Memeter backend routes
  app.use(createMemeterBackend({
    config,
    databaseService,
    pumpPortalService,
    getInMemory: () => ({ recentTokens, recentBNBTokens, recentMigrations }),
  }));

  // Create HTTP server
  const server = createServer(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = config.port;
  server.listen(port, '0.0.0.0', () => {
    log(`🚀 Server running on port ${port}`);
    log(`📍 Public URL: ${config.publicBaseUrl}`);
    log(`🌐 Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      if (pumpPortalService) {
        pumpPortalService.disconnect();
      }
      if (databaseService) {
        databaseService.close();
      }
      process.exit(0);
    });
  });
})();
