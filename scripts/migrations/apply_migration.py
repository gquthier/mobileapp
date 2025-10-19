#!/usr/bin/env python3
"""
Apply chapter migration to Supabase via SQL query
"""

import sys

# Supabase project details
SUPABASE_URL = "https://eenyzudwktcjpefpoapi.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk"

# Read migration file
with open('supabase/migrations/011_chapter_system_enhancement.sql', 'r') as f:
    sql_content = f.read()

print("📖 Applying Chapter System Migration...")
print("=" * 50)

# Note: Supabase REST API doesn't support raw SQL execution
# You need to use the Supabase SQL Editor or psql

print("\n⚠️  Cannot apply SQL migrations via REST API")
print("\nPlease use ONE of these methods:\n")

print("METHOD 1: Supabase SQL Editor (Recommended)")
print("-" * 50)
print("1. Go to: https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/sql")
print("2. Create a new query")
print("3. Copy the contents of: supabase/migrations/011_chapter_system_enhancement.sql")
print("4. Paste and run\n")

print("METHOD 2: Using psql (if installed)")
print("-" * 50)
print("Run this command:")
print("PGPASSWORD='Samuelgabriel92' psql \\")
print("  -h aws-0-eu-central-1.pooler.supabase.com \\")
print("  -p 6543 \\")
print("  -U postgres.eenyzudwktcjpefpoapi \\")
print("  -d postgres \\")
print("  -f supabase/migrations/011_chapter_system_enhancement.sql\n")

print("METHOD 3: Manual SQL (Quick)")
print("-" * 50)
print("Copy this SQL and run it in Supabase SQL Editor:\n")
print(sql_content)
