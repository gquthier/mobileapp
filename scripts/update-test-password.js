/**
 * Script simple pour changer le mot de passe de testuser2@gmail.com
 *
 * Usage:
 * 1. Modifier OLD_PASSWORD et NEW_PASSWORD ci-dessous
 * 2. Lancer: node scripts/update-test-password.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eenyzudwktcjpefpoapi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';

// CONFIGURATION - Modifiez ces valeurs
const EMAIL = 'testuser2@gmail.com';
const OLD_PASSWORD = 'VotreAncienMotDePasse'; // ⚠️ Remplacez par l'ancien mot de passe
const NEW_PASSWORD = 'TestPassword123!';      // ⚠️ Nouveau mot de passe

async function updatePassword() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('═══════════════════════════════════════════════');
  console.log('🔐 Changement de mot de passe');
  console.log('═══════════════════════════════════════════════');
  console.log('Email:', EMAIL);
  console.log('\n1️⃣ Connexion avec l\'ancien mot de passe...');

  try {
    // Étape 1: Se connecter
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: OLD_PASSWORD,
    });

    if (signInError) {
      console.error('\n❌ ERREUR: Impossible de se connecter');
      console.error('Message:', signInError.message);
      console.log('\n💡 Solutions possibles:');
      console.log('   1. Vérifiez que OLD_PASSWORD est correct dans ce script');
      console.log('   2. Utilisez la fonction "mot de passe oublié" dans l\'app');
      console.log('   3. Lancez: node scripts/reset-password.js (envoie un email)');
      return;
    }

    console.log('✅ Connexion réussie!');

    // Étape 2: Changer le mot de passe
    console.log('\n2️⃣ Mise à jour du mot de passe...');
    const { error: updateError } = await supabase.auth.updateUser({
      password: NEW_PASSWORD,
    });

    if (updateError) {
      console.error('\n❌ ERREUR lors de la mise à jour:', updateError.message);
      return;
    }

    console.log('✅ Mot de passe changé avec succès!');

    // Étape 3: Déconnexion
    console.log('\n3️⃣ Déconnexion...');
    await supabase.auth.signOut();
    console.log('✅ Déconnexion réussie');

    // Résumé
    console.log('\n═══════════════════════════════════════════════');
    console.log('✨ SUCCÈS - Nouvelles informations:');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 Email:', EMAIL);
    console.log('🔑 Nouveau mot de passe:', NEW_PASSWORD);
    console.log('\n💡 Vous pouvez maintenant vous connecter avec ces identifiants!');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERREUR INATTENDUE:', error.message);
  }
}

// Vérifier que les mots de passe ont été modifiés
if (OLD_PASSWORD === 'VotreAncienMotDePasse') {
  console.error('\n⚠️  ERREUR: Vous devez modifier OLD_PASSWORD dans le script!');
  console.log('Ouvrez scripts/update-test-password.js et modifiez la ligne:');
  console.log('const OLD_PASSWORD = "VotreAncienMotDePasse"; // ← Remplacez ceci\n');
  process.exit(1);
}

updatePassword();
