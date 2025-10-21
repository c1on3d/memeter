# Database Service

PostgreSQL database service for Memeter using Sequelize ORM.

## Features

- ✅ **Token Storage** - Persistent storage for token data
- ✅ **Migration Tracking** - Records token migration events
- ✅ **Search & Query** - Find tokens by mint, symbol, or name
- ✅ **Statistics** - Track total tokens and migrations
- ✅ **Graceful Fallback** - Works without database (in-memory mode)

## Database Schema

### Tokens Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| mint | STRING(50) | Token mint address (unique) |
| name | STRING(255) | Token name |
| symbol | STRING(50) | Token symbol |
| decimals | INTEGER | Token decimals (default: 6) |
| uri | TEXT | Metadata URI |
| description | TEXT | Token description |
| image | TEXT | Image URL |
| creator | STRING(50) | Creator address |
| marketCap | DECIMAL(20,8) | Market cap in USD |
| marketCapSol | DECIMAL(20,8) | Market cap in SOL |
| volume24h | DECIMAL(20,8) | 24h volume |
| price | DECIMAL(20,12) | Token price |
| pool | STRING(50) | Pool identifier (pump, bonk, etc.) |
| createdAt | DATE | Creation timestamp |
| updatedAt | DATE | Last update timestamp |

**Indexes:**
- Unique index on `mint`
- Index on `createdAt` for sorting
- Index on `symbol` for searching

### Migrations Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| tokenMint | STRING(50) | Token mint address |
| tokenName | STRING(255) | Token name |
| tokenSymbol | STRING(50) | Token symbol |
| fromRaydium | BOOLEAN | Migrated from Raydium |
| toRaydium | BOOLEAN | Migrated to Raydium |
| marketCapAtMigration | DECIMAL(20,8) | Market cap at migration |
| volumeAtMigration | DECIMAL(20,8) | Volume at migration |
| migrationTime | DATE | Migration timestamp |
| createdAt | DATE | Creation timestamp |
| updatedAt | DATE | Last update timestamp |

**Indexes:**
- Index on `tokenMint`
- Index on `migrationTime` for sorting

## Setup

### 1. Install PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql
sudo systemctl start postgresql
```

### 2. Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE memeter;

-- Create user (optional)
CREATE USER memeter_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE memeter TO memeter_user;
```

### 3. Configure Environment

Add to your `.env` file:

```env
# Enable database
ENABLE_DATABASE=true

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memeter
DB_USER=postgres
DB_PASSWORD=your_password
DB_LOGGING=false
```

### 4. Start Server

The database will be automatically initialized when you start the server:

```bash
npm run dev
```

You should see:
```
✅ Database connection established successfully
✅ Database models defined
✅ Database models synchronized
```

## API Methods

### Token Operations

```typescript
// Save a token
await databaseService.saveToken({
  mint: '...',
  name: 'Token Name',
  symbol: 'TKN',
  // ... other fields
});

// Get recent tokens
const tokens = await databaseService.getRecentTokens(100);

// Get token by mint address
const token = await databaseService.getTokenByMint('...');

// Search tokens
const results = await databaseService.searchTokens('SOL', 20);
```

### Migration Operations

```typescript
// Save a migration
await databaseService.saveMigration({
  tokenMint: '...',
  tokenName: 'Token Name',
  tokenSymbol: 'TKN',
  marketCapAtMigration: 1000000,
  volumeAtMigration: 500000,
  migrationTime: new Date(),
});

// Get recent migrations
const migrations = await databaseService.getRecentMigrations(100);

// Get migration by token mint
const migration = await databaseService.getMigrationByTokenMint('...');
```

### Statistics

```typescript
// Get database statistics
const stats = await databaseService.getStats();
console.log(stats); // { totalTokens: 1234, totalMigrations: 56 }
```

## Error Handling

The database service is designed to fail gracefully:

- If database is not enabled, all operations return `null` or empty arrays
- Errors are logged but don't crash the server
- In-memory storage is used as fallback

## Development

### Reset Database

```sql
-- Drop all tables
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;

-- Restart server to recreate tables
```

### Enable Query Logging

Set in `.env`:
```env
DB_LOGGING=true
```

### Alter Tables (Development Only)

Change in `service.ts`:
```typescript
await this.sequelize.sync({ alter: true });
```

⚠️ **Warning:** Only use `alter: true` in development. It may cause data loss!

## Production Deployment

### Environment Variables

Set these on your hosting platform (Vercel, Railway, etc.):

```env
ENABLE_DATABASE=true
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=memeter_prod
DB_USER=memeter_prod_user
DB_PASSWORD=strong_password_here
DB_LOGGING=false
```

### Database Providers

**Recommended:**
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Supabase](https://supabase.com) - PostgreSQL with extras
- [Railway](https://railway.app) - PostgreSQL hosting
- [ElephantSQL](https://www.elephantsql.com) - PostgreSQL as a service

### Migrations (Future)

For production, consider using Sequelize migrations:

```bash
npm install --save-dev sequelize-cli
npx sequelize-cli init
npx sequelize-cli migration:generate --name create-tokens-table
npx sequelize-cli db:migrate
```

## Troubleshooting

### Connection Issues

```
❌ Unable to connect to the database: connect ECONNREFUSED
```

**Solution:**
- Check PostgreSQL is running: `pg_isready`
- Verify connection details in `.env`
- Check firewall/network settings

### Authentication Failed

```
❌ password authentication failed for user "postgres"
```

**Solution:**
- Check DB_PASSWORD in `.env`
- Reset password: `ALTER USER postgres PASSWORD 'new_password';`

### Database Does Not Exist

```
❌ database "memeter" does not exist
```

**Solution:**
- Create database: `CREATE DATABASE memeter;`
- Or update DB_NAME in `.env`

## Performance Tips

1. **Indexes** - Already configured on frequently queried fields
2. **Connection Pooling** - Configured with max 5 connections
3. **Query Optimization** - Use `limit` parameters
4. **Caching** - Consider Redis for frequently accessed data

## Security

- ✅ Parameterized queries (SQL injection protection)
- ✅ Password in environment variables
- ✅ Connection pooling with timeouts
- ⚠️ Enable SSL in production:

```typescript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

---

**Need help?** Check the [main README](../../../README.md) or open an issue.


