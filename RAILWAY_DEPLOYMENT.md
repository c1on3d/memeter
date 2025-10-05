# 🚂 Railway Deployment Guide for Memeter

## Quick Start

1. **Sign up**: Go to [railway.app](https://railway.app) and connect your GitHub account
2. **Deploy**: Click "New Project" → "Deploy from GitHub repo" → Select your Memeter repository
3. **Add Database**: Click "New" → "Database" → "PostgreSQL"
4. **Configure**: Add environment variables (see below)
5. **Deploy**: Railway will automatically deploy your app!

## Environment Variables

Add these in your Railway project settings:

```bash
# Required
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production

# Optional
PORT=5000
```

## Database Setup

1. **Get DATABASE_URL**:
   - Go to your PostgreSQL service in Railway
   - Click "Variables" tab
   - Copy the `DATABASE_URL` value
   - Add it to your main service environment variables

2. **Run Migrations** (if needed):
   ```bash
   railway run npm run db:push
   ```

## Project Structure

Railway will automatically:
- ✅ Detect your `railway.json` configuration
- ✅ Build using `npm run build:all`
- ✅ Start with `npm run start`
- ✅ Use your health check endpoint `/api/status`

## Custom Domain

1. Go to your service settings in Railway
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Monitoring

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Monitor CPU, memory, and network usage
- **Health**: Automatic health checks on `/api/status`

## Troubleshooting

### Build Issues
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify `railway.json` configuration

### Database Issues
- Verify `DATABASE_URL` is correctly set
- Check database service is running
- Review connection logs

### Runtime Issues
- Check application logs
- Verify environment variables
- Test health check endpoint

## Cost Optimization

- **Free Tier**: 500 hours/month, $5 credit
- **Pro Plan**: $5/month for unlimited usage
- **Database**: PostgreSQL included in plans

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Community**: [Railway Discord](https://discord.gg/railway)
- **Status**: [status.railway.app](https://status.railway.app)
