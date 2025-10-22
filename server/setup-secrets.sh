#!/bin/bash

# Configuration
PROJECT_ID="your-project-id"  # Replace with your GCP project ID

echo "Setting up Google Cloud Secret Manager..."

# Create secrets (run these commands one by one)
echo "Creating db-password secret..."
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

echo "Creating helius-api-key secret..."
echo -n "YOUR_HELIUS_API_KEY" | gcloud secrets create helius-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

echo ""
echo "✅ Secrets created!"
echo ""
echo "To update a secret later, use:"
echo "echo -n 'NEW_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=-"
