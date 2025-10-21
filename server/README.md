# Memeter Backend

Modern, modular TypeScript backend for Memeter token tracking platform.

## Structure

```
server/
├── index.ts           # Main application entry point
├── vite.ts           # Vite dev server integration
└── src/
    ├── config/
    │   └── appConfig.ts              # Environment & feature configuration
    ├── database/
    │   ├── service.ts                # PostgreSQL/Sequelize service
    │   ├── models.ts                 # Database models (Token, Migration)
    │   └── README.md                 # Database setup guide
    ├── services/
    │   └── pumpPortalService.ts      # WebSocket service for token data
    └── router.ts                     # API routes & endpoints
```

## Features

- ✅ **Modular Architecture** - Clean separation of concerns
- ✅ **TypeScript** - Full type safety
- ✅ **PostgreSQL Database** - Optional persistent storage with Sequelize ORM
- ✅ **In-Memory Fallback** - Works without database
- ✅ **Feature Toggles** - Enable/disable services via environment variables
- ✅ **WebSocket Integration** - Real-time token data from PumpPortal
- ✅ **Graceful Shutdown** - Proper cleanup on process termination
- ✅ **Search & Query** - Find tokens by mint, symbol, or name

## Configuration

Set environment variables in `.env`:

```env
# Server
PORT=5000
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:5000

# Features
ENABLE_DATABASE=false      # PostgreSQL storage (optional)
ENABLE_PUMPPORTAL=true     # WebSocket token feed

# Database (if ENABLE_DATABASE=true)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memeter
DB_USER=postgres
DB_PASSWORD=your_password
DB_LOGGING=false
```

## API Endpoints

### Status
- `GET /api/status` - Health check & service status

### Tokens
- `GET /api/new` - Recent tokens from WebSocket
- `GET /api/tokens` - All tokens (paginated)
- `GET /api/pumpportal/new-tokens` - PumpPortal feed
- `GET /api/pumpportal/stats` - Service statistics

### Migrations
- `GET /api/migrations/recent` - Recent token migrations
- `GET /api/pumpportal/migrations` - Migration events

### Utilities
- `GET /api/image-proxy?url=...` - Proxy images (CORS bypass)
- `GET /api/debug/pumpportal` - Debug information

## Development

```bash
npm run dev          # Start development server
npm run build        # Build frontend
npm run build:server # Build backend
npm run build:all    # Build both
npm start           # Start production server
```

## Database

### Setup PostgreSQL (Optional)

The backend supports multiple PostgreSQL configurations:

- **Google Cloud SQL** (recommended for production) - See [GOOGLE_CLOUD_SETUP.md](../GOOGLE_CLOUD_SETUP.md)
- **Local PostgreSQL** - See [DATABASE.md](./DATABASE.md)
- **Docker Compose** - Run `docker-compose up -d`

**Quick Start (Local Development):**

1. Use Docker: `docker-compose up -d`
2. Configure `.env`:
   ```env
   ENABLE_DATABASE=true
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=memeter
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```
3. Start server - tables are created automatically

**Production (Google Cloud SQL):**

See [GOOGLE_CLOUD_SETUP.md](../GOOGLE_CLOUD_SETUP.md) for comprehensive setup guide.

### Database Models

#### Tokens Table
Stores token information (mint, name, symbol, price, etc.)

#### Migrations Table
Tracks token migration events (market cap, volume, timing)

### API Methods

```typescript
// Save token
await databaseService.saveToken(tokenData);

// Get recent tokens
const tokens = await databaseService.getRecentTokens(100);

// Search tokens
const results = await databaseService.searchTokens('SOL');

// Get statistics
const stats = await databaseService.getStats();
```

## Architecture Notes

- **In-Memory Storage**: Recent tokens/migrations stored in RAM (default, always available)
- **Database Storage**: Optional PostgreSQL for long-term persistence
- **Hybrid Mode**: Can run with both in-memory + database simultaneously
- **WebSocket**: Connects to PumpPortal for real-time token creation events
- **Image Proxy**: Bypasses CORS issues for token images
- **Vite Integration**: Serves frontend in development mode
- **Graceful Fallback**: Database errors don't crash the server
