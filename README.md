# Memeter - Memecoin Alpha Tracker

Real-time memecoin tracker for Solana with PumpPortal integration.

## Features

- 🔴 Live token tracking from PumpPortal
- 💰 Real-time trade tracking
- 🚀 Migration tracking
- 📊 Market statistics & DexScreener integration
- ⭐ Favorites system
- 🌙 Dark/Light theme

## Tech Stack

**Frontend:** React + TypeScript + Vite + TailwindCSS
**Backend:** Node.js + Express + PostgreSQL (Cloud SQL)
**Ingestion:** Python WebSocket client

## Architecture

1. **Python Script** → PumpPortal WebSocket → PostgreSQL
2. **Node.js API** → PostgreSQL → REST endpoints
3. **React Frontend** → API → User interface

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd server && npm install
```

### 2. Configure Environment

**Frontend** (`client/.env`):
```env
VITE_API_URL=http://localhost:8081
```

**Backend** (`server/.env`):
```env
PORT=8081
NODE_ENV=development
HELIUS_API_KEY=your_key
ALLOWED_ORIGINS=http://localhost:3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### 3. Setup Cloud SQL Proxy
```bash
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
```

### 4. Run Services
```bash
# Terminal 1: Python ingestion script
python your_script.py

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Frontend
npm run dev
```

Visit http://localhost:3001

## API Endpoints

- `GET /recent?limit=50` - Recent tokens
- `GET /token/:mint` - Token by mint
- `GET /search?q=query` - Search tokens
- `GET /trades/token/:mint` - Token trades
- `GET /stats` - Statistics
- `GET /health` - Health check

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

## License

MIT
