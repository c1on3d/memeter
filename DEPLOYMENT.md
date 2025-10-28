# Deployment Guide

Quick guide to deploy Memeter to production.

## Architecture

1. **Python Script** (local/VM) → Ingests PumpPortal data to PostgreSQL
2. **Node.js API** (Cloud Run) → Serves data from PostgreSQL
3. **React Frontend** (Vercel/Netlify) → User interface

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed
- PostgreSQL on Google Cloud SQL
- Node.js 20+

---

## 1. Deploy Backend (Cloud Run)

### Configure Environment

Required environment variables:
```bash
PORT=8080
NODE_ENV=production
HELIUS_API_KEY=your_key
ALLOWED_ORIGINS=https://your-frontend.com
DB_SOCKET_PATH=/cloudsql/PROJECT:REGION:INSTANCE
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Deploy

```bash
cd server

# Store password in Secret Manager
echo -n "your_password" | gcloud secrets create db-password --data-file=-

# Deploy
gcloud run deploy memeter-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080 \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE \
  --set-env-vars "NODE_ENV=production,PORT=8080,DB_SSL=true" \
  --set-env-vars "DB_SOCKET_PATH=/cloudsql/PROJECT:REGION:INSTANCE" \
  --set-env-vars "DB_NAME=your_db,DB_USER=your_user" \
  --set-env-vars "HELIUS_API_KEY=your_key" \
  --set-env-vars "ALLOWED_ORIGINS=https://your-frontend.com" \
  --set-secrets "DB_PASSWORD=db-password:latest"
```

Save the API URL: `https://memeter-api-xxxxx-uc.a.run.app`

---

## 2. Deploy Frontend

### Vercel (Recommended)

```bash
# Install CLI
npm install -g vercel

# Deploy
vercel

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://memeter-api-xxxxx-uc.a.run.app

# Deploy to production
vercel --prod
```

### Netlify

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

Then add `VITE_API_URL` in Netlify dashboard → Environment variables.

---

## 3. Python Ingestion Script

### Option A: Run Locally
Keep your Python script running on your machine with Cloud SQL connection.

### Option B: Deploy to VM

```bash
# Create VM
gcloud compute instances create pumpportal-ingestion \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud

# SSH and setup
gcloud compute ssh pumpportal-ingestion --zone=us-central1-a
sudo apt update && sudo apt install -y python3 python3-pip
pip3 install websockets psycopg2-binary python-dotenv

# Upload script
gcloud compute scp your_script.py pumpportal-ingestion:~/ --zone=us-central1-a
```

Create systemd service for auto-restart:
```bash
sudo nano /etc/systemd/system/pumpportal.service
```

```ini
[Unit]
Description=PumpPortal Ingestion
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username
ExecStart=/usr/bin/python3 /home/your_username/your_script.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pumpportal
sudo systemctl start pumpportal
```

---

## 4. Update CORS

```bash
gcloud run services update memeter-api \
  --region us-central1 \
  --update-env-vars "ALLOWED_ORIGINS=https://your-frontend.com"
```

---

## Testing

```bash
# Test backend
curl https://memeter-api-xxxxx-uc.a.run.app/health
curl https://memeter-api-xxxxx-uc.a.run.app/recent?limit=5

# Test frontend
# Visit URL and check browser console for errors
```

---

## Monitoring

```bash
# View logs
gcloud run services logs read memeter-api --region us-central1 --limit 50

# View metrics
# https://console.cloud.google.com/run
```

---

## Troubleshooting

**Backend won't start:**
- Check logs: `gcloud run services logs read memeter-api`
- Verify database connection and Cloud SQL instance is running

**Frontend can't reach backend:**
- Check CORS settings
- Verify `VITE_API_URL` is correct

**No data showing:**
- Verify Python script is running
- Check database: `SELECT COUNT(*) FROM tokens;`

---

## Estimated Costs

- Cloud Run: ~$5-20/month
- Cloud SQL: ~$10-50/month
- Frontend: Free (Vercel/Netlify)
- VM (optional): ~$5/month

**Total:** ~$20-80/month
