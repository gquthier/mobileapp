#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserProfile() {
  try {
    console.log('🔧 Fixing user profile preferred_language from "auto" to "fr"...');

    // Update all user profiles that have 'auto' as preferred_language to 'fr'
    const { data, error } = await supabase
      .from('profiles')
      .update({ preferred_language: 'fr' })
      .eq('preferred_language', 'auto')
      .select();

    if (error) {
      console.error('❌ Error updating profiles:', error);
      return;
    }

    console.log('✅ Successfully updated profiles:', data?.length || 0);
    if (data && data.length > 0) {
      data.forEach(profile => {
        console.log(`  - User ${profile.id}: preferred_language set to 'fr'`);
      });
    } else {
      console.log('ℹ️  No profiles found with preferred_language = "auto"');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixUserProfile();