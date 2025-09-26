#!/usr/bin/env node

// Script pour créer un utilisateur de test via l'API Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Clé service requise
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function createTestUser() {
  console.log('🧪 Création d\'un utilisateur de test...');
  console.log('URL:', supabaseUrl);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    return;
  }

  // Utiliser le client normal pour tester le sign-up
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Tester l'inscription normale avec un email plus réaliste
    const testEmail = 'testuser@gmail.com';
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'example123'
    });

    if (error) {
      console.error('❌ Erreur lors de la création:', error);
      return;
    }

    if (data.user) {
      console.log('✅ Utilisateur de test créé !');
      console.log('📧 Email:', data.user.email);
      console.log('🆔 ID:', data.user.id);
      console.log('📅 Créé:', data.user.created_at);

      if (data.session) {
        console.log('🔐 Session active');
      } else {
        console.log('📧 Confirmation email requise');
      }
    }
  } catch (err) {
    console.error('❌ Erreur script:', err);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };