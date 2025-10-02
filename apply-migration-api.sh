#!/bin/bash

# Script to apply user questions migration via Supabase API
echo "🚀 Applying user questions migration via Supabase Management API..."

# Read the SQL file
SQL_CONTENT=$(cat supabase/migrations/006_user_questions.sql)

# Supabase Project details
PROJECT_REF="eenyzudwktcjpefpoapi"
SUPABASE_ACCESS_TOKEN="sbp_e15de5e8c1784eb27da61c9a2a1e4c1c8a9c5f67"

# Execute SQL using Supabase Management API
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo ""
echo "✅ Migration request sent!"
