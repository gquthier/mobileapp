#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🔗 Connecting to Supabase...');

    // Test connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error && error.code !== 'PGRST116') {
      console.log('📋 Database schema needs to be applied');
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('1. Go to your Supabase Dashboard: https://eenyzudwktcjpefpoapi.supabase.co');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and execute the contents of: supabase/migrations/001_initial_schema.sql');
      console.log('');
      console.log('The schema will create:');
      console.log('- ✅ profiles table (user accounts)');
      console.log('- ✅ chapters table (life chapters)');
      console.log('- ✅ themes table (chapter themes)');
      console.log('- ✅ videos table (recorded videos)');
      console.log('- ✅ transcriptions table (audio transcripts)');
      console.log('- ✅ RLS policies (security)');
      console.log('- ✅ Storage bucket (video files)');
      console.log('- ✅ Indexes (performance)');

      process.exit(1);
    }

    console.log('✅ Database connection successful!');
    console.log('📊 Checking existing tables...');

    // Check if main tables exist
    const tables = ['profiles', 'chapters', 'themes', 'videos', 'transcriptions'];

    for (const table of tables) {
      try {
        const { error: checkError } = await supabase.from(table).select('count').limit(1);

        if (checkError) {
          console.log(`❌ Table "${table}" not found`);
        } else {
          console.log(`✅ Table "${table}" exists`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}" not accessible`);
      }
    }

    console.log('');
    console.log('🎯 Database setup complete!');
    console.log('🚀 You can now run: npm start');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();