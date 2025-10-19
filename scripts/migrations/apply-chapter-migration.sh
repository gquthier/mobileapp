#!/bin/bash

# Script to apply chapter system migration to Supabase
# Run this in Supabase SQL Editor or via psql

echo "📖 Chapter System Migration"
echo "=========================="
echo ""
echo "Copy and paste the following SQL into your Supabase SQL Editor:"
echo ""
echo "https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/sql"
echo ""
echo "Or run directly with psql (if you have it installed):"
echo ""
echo "PGPASSWORD='Samuelgabriel92' psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.eenyzudwktcjpefpoapi -d postgres -f supabase/migrations/011_chapter_system_enhancement.sql"
echo ""
echo "=========================="
cat supabase/migrations/011_chapter_system_enhancement.sql
