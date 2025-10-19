#!/bin/bash

# Script to apply user questions migration
echo "🚀 Applying user questions migration..."

# Apply the migration
npx supabase db push --db-url "postgresql://postgres.eenyzudwktcjpefpoapi:Samuelgabriel92@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --file supabase/migrations/006_user_questions.sql

echo "✅ Migration applied successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the Edge Function: npx supabase functions deploy generate-user-questions"
echo "2. Test the system in the app"
