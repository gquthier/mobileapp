/**
 * Script utilitaire pour réinitialiser le mot de passe d'un compte de test
 *
 * Usage:
 * npx ts-node scripts/reset-test-account-password.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eenyzudwktcjpefpoapi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMjY5NTcsImV4cCI6MjA0ODkwMjk1N30.qstUjSKeyRM2qKE3nPWxcL3LZXKQT4aEsvNPLrcDZrw';

// Configuration
const TEST_EMAIL = 'testuser2@gmail.com';
const OLD_PASSWORD = 'Test123456!'; // Essayez ce mot de passe commun
const NEW_PASSWORD = 'NewPassword123!'; // Nouveau mot de passe

async function resetTestAccountPassword() {
  console.log('🔐 Réinitialisation du mot de passe pour:', TEST_EMAIL);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Étape 1: Essayer de se connecter avec l'ancien mot de passe
    console.log('1️⃣ Tentative de connexion avec l\'ancien mot de passe...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: OLD_PASSWORD,
    });

    if (signInError) {
      console.error('❌ Erreur de connexion:', signInError.message);
      console.log('\n💡 Si vous avez oublié le mot de passe, utilisez la méthode resetPasswordForEmail:');

      // Méthode alternative: Envoyer un email de réinitialisation
      console.log('2️⃣ Envoi d\'un email de réinitialisation...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(TEST_EMAIL, {
        redirectTo: 'http://localhost:19006/reset-password',
      });

      if (resetError) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', resetError.message);
        return;
      }

      console.log('✅ Email de réinitialisation envoyé à:', TEST_EMAIL);
      console.log('📧 Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser le mot de passe.');
      return;
    }

    console.log('✅ Connexion réussie!');

    // Étape 2: Mettre à jour le mot de passe
    console.log('2️⃣ Mise à jour du mot de passe...');
    const { error: updateError } = await supabase.auth.updateUser({
      password: NEW_PASSWORD,
    });

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateError.message);
      return;
    }

    console.log('✅ Mot de passe mis à jour avec succès!');
    console.log('\n📝 Nouvelles informations de connexion:');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Mot de passe:', NEW_PASSWORD);

    // Étape 3: Se déconnecter
    await supabase.auth.signOut();
    console.log('✅ Déconnexion réussie');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter le script
resetTestAccountPassword()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec du script:', error);
    process.exit(1);
  });
