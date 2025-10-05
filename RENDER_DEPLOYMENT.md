# Render Deployment Guide for Memeter

This guide will help you deploy your Memeter backend to Render.

## Prerequisites

- GitHub account with your Memeter repository
- Render account (free tier available)

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

## Step 2: Deploy Backend

### Option A: Using render.yaml (Recommended)

1. Push your code to GitHub (including the `render.yaml` file)
2. In Render dashboard, click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - Web service for your backend
   - PostgreSQL database

### Option B: Manual Setup

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `memeter-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm run start`
   - **Plan**: Free

## Step 3: Add PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `memeter-db`
   - **Database**: `memeter`
   - **User**: `memeter_user`
   - **Plan**: Free
3. Click **"Create Database"**

## Step 4: Configure Environment Variables

1. Go to your web service settings
2. Click **"Environment"** tab
3. Add these environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (Copy from your PostgreSQL database's "Internal Database URL")

## Step 5: Deploy

1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for build to complete (5-10 minutes)
3. Your backend will be available at: `https://memeter-backend.onrender.com`

## Step 6: Update Frontend

Your frontend is already configured to use Render! The API URL is set to:
```
https://memeter-backend.onrender.com
```

## Step 7: Redeploy Vercel

Push your changes to GitHub to trigger a Vercel redeploy:
```bash
git add .
git commit -m "Switch from Railway to Render"
git push origin main
```

## Verify Deployment

1. Check backend health: `https://memeter-backend.onrender.com/api/status`
2. Check live tokens: `https://memeter-backend.onrender.com/api/pumpportal/new-tokens`
3. Visit your Vercel site: `https://memeter.fun`

## Free Tier Limits

- **750 hours/month** of runtime
- **512 MB RAM**
- **PostgreSQL**: 1 GB storage, 97 connections
- **Automatic sleep** after 15 minutes of inactivity (first request takes ~30 seconds to wake up)

## Troubleshooting

### Backend not responding
- Check logs in Render dashboard
- Verify environment variables are set correctly
- Ensure DATABASE_URL is using the Internal Database URL

### Database connection errors
- Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
- Check database is running in Render dashboard
- Ensure SSL is enabled in database settings

### Frontend not showing live data
- Verify backend is deployed and running
- Check browser console for API errors
- Ensure Vercel deployment completed successfully

## Support

For issues, check:
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
