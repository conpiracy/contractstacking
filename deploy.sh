#!/bin/bash
# SDR Job Bot - Cloud Deployment Script (Google Cloud Run)

set -e

echo "🚀 SDR Job Bot - Cloud Deployment"
echo "=================================="
echo ""

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="sdr-job-bot"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "📋 Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t ${SERVICE_NAME}:latest .
echo "✅ Docker image built"
echo ""

# Tag for GCR
echo "🏷️  Tagging image for Google Container Registry..."
docker tag ${SERVICE_NAME}:latest ${IMAGE_NAME}:latest
echo "✅ Image tagged"
echo ""

# Push to GCR
echo "📤 Pushing image to GCR..."
docker push ${IMAGE_NAME}:latest
echo "✅ Image pushed"
echo ""

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --no-allow-unauthenticated \
    --set-env-vars "$(cat .env | grep -v '^#' | grep -v '^$' | tr '\n' ',' | sed 's/,$//')" \
    --memory 512Mi \
    --timeout 900 \
    --max-instances 1

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format 'value(status.url)')

echo "Service URL: ${SERVICE_URL}"
echo ""

# Setup Cloud Scheduler (optional)
echo "Would you like to set up Cloud Scheduler to run this job automatically?"
echo "This will run the bot every hour."
read -p "Setup scheduler? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📅 Setting up Cloud Scheduler..."

    # Create service account for scheduler
    gcloud iam service-accounts create ${SERVICE_NAME}-scheduler \
        --display-name "${SERVICE_NAME} Scheduler" \
        --project ${PROJECT_ID} || true

    # Grant invoker role
    gcloud run services add-iam-policy-binding ${SERVICE_NAME} \
        --member="serviceAccount:${SERVICE_NAME}-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/run.invoker" \
        --region ${REGION} \
        --project ${PROJECT_ID}

    # Create scheduler job
    gcloud scheduler jobs create http ${SERVICE_NAME}-hourly \
        --schedule="0 * * * *" \
        --uri="${SERVICE_URL}" \
        --http-method=POST \
        --oidc-service-account-email="${SERVICE_NAME}-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
        --location=${REGION} \
        --project=${PROJECT_ID} || true

    echo "✅ Scheduler configured to run every hour"
fi

echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Monitor logs: gcloud run logs tail ${SERVICE_NAME} --project ${PROJECT_ID}"
echo "2. Trigger manually: gcloud run services describe ${SERVICE_NAME}"
echo "3. Update secrets in Cloud Console if needed"
echo ""
