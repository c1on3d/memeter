# How to Enable PostgreSQL Database

Your Memeter app is currently running in **in-memory mode** (fast, no setup needed). Follow these steps when you're ready to enable permanent PostgreSQL storage.

## ✅ Current Setup Status

- ✅ PostgreSQL 17 is installed and running
- ✅ Configuration files created
- ✅ Setup script ready
- ⏳ Database creation pending
- ⏳ `.env` configuration pending

## 🚀 Quick Enable (3 Steps)

### Step 1: Find Your PostgreSQL Password

Your PostgreSQL password is what you set during installation. Common defaults:
- `postgres`
- Your Windows username
- Password you set during install

**Don't know your password?** See "Reset PostgreSQL Password" section below.

### Step 2: Create Database

Open a **new PowerShell window** (not in IDE terminal) and run:

```powershell
cd C:\Users\Parke\Desktop\SITES\Memeter

# Option A: Use the automated setup script (recommended)
.\setup-database.ps1

# Option B: Create database manually
$env:PGPASSWORD='YOUR_PASSWORD_HERE'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE memeter;"
Remove-Item Env:\PGPASSWORD
```

### Step 3: Update .env File

Create or edit `.env` file in your project root:

```env
# Change this to true
ENABLE_DATABASE=true

# Update password
DB_PASSWORD=your_actual_password_here
```

Then restart your server:

```powershell
npm run dev
```

## ✅ Verify Database is Enabled

You should see in the console:

```
✅ Database connection established successfully
✅ Database models defined
✅ Database models synchronized
```

And the API status will show:

```json
{
  "status": "ok",
  "database": "enabled"  ← Should say "enabled"
}
```

## 🔐 Reset PostgreSQL Password (If Needed)

If you don't know your PostgreSQL password:

1. **Open PowerShell as Administrator**

2. **Find PostgreSQL data directory:**
   ```powershell
   $pgData = "C:\Program Files\PostgreSQL\17\data"
   ```

3. **Edit pg_hba.conf:**
   ```powershell
   notepad "$pgData\pg_hba.conf"
   ```
   
   Find these lines near the bottom:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   host    all             all             ::1/128                 scram-sha-256
   ```
   
   Change `scram-sha-256` to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   host    all             all             ::1/128                 trust
   ```

4. **Restart PostgreSQL:**
   ```powershell
   Restart-Service postgresql-x64-17
   ```

5. **Change password (no password needed now):**
   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "ALTER USER postgres PASSWORD 'new_password_here';"
   ```

6. **Restore pg_hba.conf** (change `trust` back to `scram-sha-256`)

7. **Restart PostgreSQL again:**
   ```powershell
   Restart-Service postgresql-x64-17
   ```

## 📊 Benefits of Enabling Database

Once enabled, you'll get:

- ✅ **Permanent Storage** - Data survives server restarts
- ✅ **Unlimited Tokens** - Not limited to 1000 in-memory
- ✅ **Migration History** - Track all token migrations
- ✅ **Advanced Queries** - Search and filter efficiently
- ✅ **Production Ready** - Deploy with confidence
- ✅ **Backup & Restore** - PostgreSQL backup tools

## 🌐 Production Database Options

For deployment, consider these managed PostgreSQL services:

### Neon (Recommended)
- **Free Tier:** 0.5 GB storage, serverless
- **URL:** https://neon.tech
- **Setup:** Copy connection string to `.env`

### Supabase
- **Free Tier:** 500 MB, includes API
- **URL:** https://supabase.com
- **Setup:** Use database URL from settings

### Railway
- **Free Tier:** $5 credit/month
- **URL:** https://railway.app
- **Setup:** One-click PostgreSQL deployment

### Render
- **Free Tier:** Available
- **URL:** https://render.com
- **Setup:** Create PostgreSQL service

For production, update `.env` with connection details:

```env
ENABLE_DATABASE=true
DB_HOST=your-production-host.com
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

## 🆘 Troubleshooting

### "Port is already in use"
```powershell
Get-Process -Name node | Stop-Process -Force
npm run dev
```

### "Password authentication failed"
Your password in `.env` is incorrect. See "Reset PostgreSQL Password" above.

### "Connection refused"
PostgreSQL isn't running:
```powershell
Start-Service postgresql-x64-17
```

### Database already exists
That's fine! Just update your `.env` and restart.

## 📝 Notes

- **In-memory mode is perfectly fine for development!** Enable database only when you need permanent storage.
- Your current setup saves ~1000 recent tokens in memory - usually enough for testing.
- Database adds about 1-2 seconds to startup time due to connection and sync.
- All your code already supports both modes - no changes needed!

---

**Questions?** Check `DATABASE_SETUP.md` for detailed PostgreSQL setup guide.

