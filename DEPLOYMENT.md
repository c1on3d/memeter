# Deployment Guide - Google Cloud Run + Vercel

## Prerequisites

1. Google Cloud SDK installed: `gcloud --version`
2. Vercel CLI installed: `npm i -g vercel`
3. Google Cloud project with billing enabled
4. Cloud SQL PostgreSQL instance running

## Backend Deployment (Google Cloud Run)

### 1. Set Your Project

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 3. Create Secrets

```bash
# Database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-

# Helius API key
echo -n "YOUR_HELIUS_API_KEY" | gcloud secrets create helius-api-key --data-file=-
```

### 4. Deploy Backend

```bash
cd server

# Deploy with Cloud Build
gcloud run deploy memeter-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT:us-central1:memeter-db \
  --set-env-vars "NODE_ENV=production,PORT=8080,DB_HOST=/cloudsql/YOUR_PROJECT:us-central1:memeter-db,DB_PORT=5432,DB_USER=postgres,DB_NAME=memeter,PUMPPORTAL_WS_URL=wss://pumpportal.fun/api/data,PUMPAPI_WS_URL=wss://stream.pumpapi.io/,ALLOWED_ORIGINS=https://your-app.vercel.app" \
  --set-secrets "DB_PASSWORD=db-password:latest,HELIUS_API_KEY=helius-api-key:latest" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 1
```

### 5. Get Backend URL

```bash
gcloud run services describe memeter-api --region us-central1 --format='value(status.url)'
```

Copy this URL - you'll need it for Vercel!

## Frontend Deployment (Vercel)

### 1. Update Environment Variable

```bash
cd client

# Create production env file
echo "VITE_API_URL=https://your-backend-url.run.app" > .env.production
```

### 2. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Set Environment Variable in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.run.app`
   - **Environments**: Production, Preview, Development

### 4. Redeploy

```bash
vercel --prod
```

## Update CORS After Vercel Deployment

Once you have your Vercel URL, update the backend:

```bash
gcloud run services update memeter-api \
  --region us-central1 \
  --update-env-vars "ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app"
```

## Verify Deployment

### Test Backend

```bash
curl https://your-backend-url.run.app/health
```

### Test Frontend

Open your Vercel URL and check the browser console for:
- ✅ API connection successful
- ✅ Tokens loading
- ✅ No CORS errors

## Monitoring

### View Logs

```bash
# Backend logs
gcloud run services logs read memeter-api --region us-central1 --limit 50

# Follow logs in real-time
gcloud run services logs tail memeter-api --region us-central1
```

### Check Database Connection

```bash
gcloud sql instances describe memeter-db
```

## Troubleshooting

### CORS Errors

Update ALLOWED_ORIGINS to include all Vercel preview URLs:

```bash
gcloud run services update memeter-api \
  --region us-central1 \
  --update-env-vars "ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app"
```

### Database Connection Issues

Check Cloud SQL instance is running:

```bash
gcloud sql instances list
```

Verify Cloud Run has access:

```bash
gcloud run services describe memeter-api --region us-central1 --format='value(spec.template.metadata.annotations)'
```

### WebSocket Issues

Cloud Run supports WebSockets! Make sure:
- Timeout is set to 300s (done in deploy command)
- Min instances is 1 (keeps WebSocket connections alive)

## Cost Optimization

### Reduce Costs

```bash
# Set min instances to 0 (but WebSockets will disconnect)
gcloud run services update memeter-api \
  --region us-central1 \
  --min-instances 0

# Reduce memory
gcloud run services update memeter-api \
  --region us-central1 \
  --memory 512Mi
```

### Current Setup Costs (Estimate)

- Cloud Run: ~$10-30/month (with min-instances=1)
- Cloud SQL: ~$10-50/month (depends on instance size)
- Vercel: Free tier (hobby plan)

**Total: ~$20-80/month**

## Quick Commands Reference

```bash
# Deploy backend
cd server && gcloud run deploy memeter-api --source . --region us-central1

# Deploy frontend
cd client && vercel --prod

# View backend logs
gcloud run services logs tail memeter-api --region us-central1

# Update environment variable
gcloud run services update memeter-api --region us-central1 --update-env-vars "KEY=VALUE"

# Get backend URL
gcloud run services describe memeter-api --region us-central1 --format='value(status.url)'
```
