#!/bin/bash

# Configuration
PROJECT_ID="your-project-id"  # Replace with your GCP project ID
REGION="us-central1"
SERVICE_NAME="memeter-api"
INSTANCE_CONNECTION_NAME="your-project-id:us-central1:memeter-db"  # Replace with your Cloud SQL instance

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "DB_PASSWORD=db-password:latest,HELIUS_API_KEY=helius-api-key:latest" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 1 \
  --project $PROJECT_ID

# Get the service URL
echo "Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)' --project $PROJECT_ID)

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Update your Vercel environment variable VITE_API_URL to: $SERVICE_URL"
echo "2. Update ALLOWED_ORIGINS in Cloud Run to include your Vercel domain"
