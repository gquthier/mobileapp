/**
 * Script pour réinitialiser le mot de passe du compte testuser2@gmail.com
 *
 * Usage: node scripts/reset-password.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eenyzudwktcjpefpoapi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';

const TEST_EMAIL = 'testuser2@gmail.com';
const NEW_PASSWORD = 'TestPassword123!';

async function resetPassword() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔐 Envoi d\'un email de réinitialisation à:', TEST_EMAIL);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(TEST_EMAIL, {
      redirectTo: 'http://localhost:19006/auth',
    });

    if (error) {
      console.error('❌ Erreur:', error.message);
      return;
    }

    console.log('✅ Email de réinitialisation envoyé avec succès!');
    console.log('📧 Vérifiez la boîte mail de:', TEST_EMAIL);
    console.log('🔗 Cliquez sur le lien dans l\'email pour définir un nouveau mot de passe');
    console.log('\n💡 Nouveau mot de passe suggéré:', NEW_PASSWORD);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

resetPassword();
