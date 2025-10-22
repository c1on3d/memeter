# Memeter - Memecoin Alpha Tracker

Real-time memecoin tracker for Solana, connected to PumpPortal WebSocket and Google Cloud SQL.

## Features

- 🔴 Live token tracking from PumpPortal & PumpAPI.io
- 💰 Real-time trade tracking (buys/sells)
- 🚀 Migration tracking (graduated tokens)
- 💾 Cloud SQL database storage
- 🖼️ Token images with CORS proxy
- 🔗 Social media links extraction
- 📊 Real-time statistics & market data
- 💹 DexScreener integration for live prices
- ⭐ Favorites system
- 🌙 Dark/Light theme

## Tech Stack

**Frontend:**
- React + TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Wouter (routing)

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL (Cloud SQL)
- WebSocket (PumpPortal)

## Setup

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### 2. Configure Environment

**Frontend** (`client/.env`):
```env
VITE_API_URL=http://localhost:8080
```

**Backend** (`server/.env`):
```env
PORT=8080
DB_HOST=your-cloud-sql-ip
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=memeter
PUMPPORTAL_WS_URL=wss://pumpportal.fun/api/data
PUMPAPI_WS_URL=wss://stream.pumpapi.io/
HELIUS_API_KEY=your_helius_api_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Run Development Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

Frontend: http://localhost:3001
Backend: http://localhost:8080

## API Endpoints

**Tokens:**
- `GET /recent?limit=50` - Get recent tokens
- `GET /token/:mint` - Get token by mint address
- `GET /search?q=query` - Search tokens
- `GET /migrations?limit=30` - Get graduated/migrated tokens

**Trades:**
- `GET /trades/token/:mint?limit=50` - Get trades for a token
- `GET /trades/recent?limit=100` - Get recent trades
- `GET /trades/wallet/:address?limit=50` - Get trades by wallet
- `GET /trades/stats/:mint` - Get trade statistics

**Other:**
- `GET /stats` - Get statistics
- `GET /health` - Health check
- `GET /api/image-proxy?url=...` - Image proxy
- `GET /api/price/sol` - Get SOL price
- `GET /api/marketcap/:mint` - Get token market cap

## Database Schema

```sql
CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  mint VARCHAR(44) UNIQUE NOT NULL,
  name VARCHAR(255),
  symbol VARCHAR(50),
  uri TEXT,
  image TEXT,
  description TEXT,
  creator VARCHAR(44),
  pool VARCHAR(20),
  market_cap_sol DECIMAL(20, 8),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  website TEXT,
  twitter TEXT,
  telegram TEXT,
  discord TEXT,
  youtube TEXT,
  instagram TEXT,
  reddit TEXT,
  tiktok TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Backend (Google Cloud Run)

```bash
cd server
gcloud run deploy memeter-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE
```

### Frontend

Build and deploy to your preferred hosting:

```bash
npm run build
# Deploy dist/public folder
```

Update `client/.env` with production backend URL.

## License

MIT
