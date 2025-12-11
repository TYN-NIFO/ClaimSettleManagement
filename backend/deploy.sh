#!/bin/bash

# Vercel Deployment Script
# Run this to deploy to Vercel

echo "🚀 Deploying to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Must run from backend directory"
    echo "Run: cd backend && ./deploy.sh"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Ask for deployment type
echo "Select deployment type:"
echo "1) Preview (test deployment)"
echo "2) Production"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🔍 Deploying preview..."
        vercel
        ;;
    2)
        echo ""
        echo "🚀 Deploying to production..."
        vercel --prod
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test the deployment URL"
echo "2. Update frontend API URL"
echo "3. Monitor logs in Vercel dashboard"
