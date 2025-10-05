# 🚀 Deployment Guide for MEMETER

## Quick Deploy Options

### 1. **Vercel (Recommended)**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up and connect GitHub
4. Import your repository
5. Deploy automatically!

### 2. **Railway (Full-Stack)**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy

### 3. **Render**
1. Go to [render.com](https://render.com)
2. Sign up and connect GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Use these settings:
   - Build Command: `npm install && npm run build:all`
   - Start Command: `npm run start`

### 4. **Netlify (Frontend Only)**
1. Go to [netlify.com](https://netlify.com)
2. Sign up and connect GitHub
3. Deploy from repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Environment Variables

Set these in your hosting platform:

```
NODE_ENV=production
PORT=10000
```

## Database Setup

For production, you'll need a real database:

### Option 1: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create free database
3. Copy connection string
4. Add as `DATABASE_URL` environment variable

### Option 2: Railway PostgreSQL
1. In Railway, add PostgreSQL service
2. Use the connection string provided

## Custom Domain

Most platforms offer free custom domains:
- Vercel: Add domain in project settings
- Railway: Add domain in service settings
- Render: Add domain in service settings

## Troubleshooting

### Build Issues
- Make sure all dependencies are in `dependencies` not `devDependencies`
- Check Node.js version (18+ recommended)

### API Issues
- Ensure backend is properly deployed
- Check environment variables
- Verify database connection

### Frontend Issues
- Check if build completed successfully
- Verify all static assets are included
- Check browser console for errors

## Support

If you need help with deployment, check the platform's documentation or support forums.
