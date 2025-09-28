#!/bin/bash

echo "🚀 Deploying Automatic Thumbnail Generation System..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

echo "📦 Deploying Edge Function..."

# Deploy the edge function
supabase functions deploy generate-thumbnail --project-ref eenyzudwktcjpefpoapi

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully"
else
    echo "❌ Failed to deploy edge function"
    exit 1
fi

echo "🗄️ Running database migrations..."

# Apply the database migration
supabase db push --project-ref eenyzudwktcjpefpoapi

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Failed to apply database migration"
    exit 1
fi

echo "🔧 Setting up environment variables..."

# Set the service role key for the function (you'll need to replace this with your actual key)
echo "⚠️  Please set your service role key in the Supabase dashboard:"
echo "   1. Go to https://app.supabase.com/project/eenyzudwktcjpefpoapi/settings/api"
echo "   2. Copy your service_role key"
echo "   3. Go to Edge Functions settings and add:"
echo "      SUPABASE_SERVICE_ROLE_KEY = your_service_role_key"

echo ""
echo "🎉 Automatic Thumbnail Generation System deployed!"
echo ""
echo "📋 What happens now:"
echo "   • When a new video is uploaded to your app"
echo "   • A database trigger automatically calls the edge function"
echo "   • The function generates a thumbnail and stores it in Supabase Storage"
echo "   • The video record is updated with the thumbnail path"
echo "   • Your gallery will show the thumbnail automatically"
echo ""
echo "🧪 Test the system by uploading a new video through your app!"