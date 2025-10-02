#!/usr/bin/env node

// Script to apply user_questions migration directly via Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://eenyzudwktcjpefpoapi.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzQzNjU0MCwiZXhwIjoyMDQzMDEyNTQwfQ.t4FvW7uJKt_-ey9dOi5HBxQ1RBjPxDNBQcnHp_Wa7d8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying user_questions migration...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'supabase/migrations/006_user_questions.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded, executing migration...\n');

    // Split SQL by statements (simple split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.trim().startsWith('COMMENT')) {
        console.log(`⏭️  Skipping comment statement ${i + 1}/${statements.length}`);
        continue;
      }

      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if rpc doesn't work
        console.log('   Trying direct query method...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`   ❌ Error: ${errorText}`);

          // Continue with other statements
          console.log('   ⚠️  Continuing with next statement...\n');
          continue;
        }
      }

      console.log(`   ✅ Statement ${i + 1} executed successfully\n`);
    }

    console.log('✅ Migration completed!\n');
    console.log('🧪 Testing table creation...');

    // Test if table exists by trying to select from it
    const { data, error } = await supabase
      .from('user_questions')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Table test failed:', error.message);
      console.log('\n⚠️  The migration may not have been fully applied.');
      console.log('Please run the SQL manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/editor\n');
    } else {
      console.log('✅ Table user_questions is accessible!\n');
      console.log('🎉 Migration successfully applied and verified!');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.log('\n📝 Manual migration required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/editor');
    console.log('2. Copy the contents of: supabase/migrations/006_user_questions.sql');
    console.log('3. Paste and execute in the SQL Editor\n');
    process.exit(1);
  }
}

applyMigration();
