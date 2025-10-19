#!/usr/bin/env node

/**
 * Test simple de l'API OpenAI Whisper avec un fichier audio de test
 */

require('dotenv').config();
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch'); // Vous devrez installer: npm install node-fetch@2

async function testWhisperAPI() {
  console.log('🧪 TEST DE L\'API OPENAI WHISPER');
  console.log('================================');

  // 1. Vérifier la clé API
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante dans .env');
    return;
  }
  console.log('✅ Clé API trouvée:', apiKey.substring(0, 10) + '...');

  // 2. Créer un fichier audio de test simple (beep court)
  console.log('\n🎵 Création d\'un fichier audio de test...');

  // Créer un fichier WAV minimal (1 seconde de silence)
  const testAudioPath = './test-audio.wav';

  // WAV header pour 1 seconde de silence à 16kHz mono
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x08, 0x00, 0x00, // File size (2084 bytes)
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Format chunk size (16)
    0x01, 0x00,             // Audio format (PCM)
    0x01, 0x00,             // Number of channels (1)
    0x80, 0x3E, 0x00, 0x00, // Sample rate (16000)
    0x00, 0x7D, 0x00, 0x00, // Byte rate
    0x02, 0x00,             // Block align
    0x10, 0x00,             // Bits per sample (16)
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x08, 0x00, 0x00  // Data chunk size (2048)
  ]);

  // 2048 bytes de silence (zéros)
  const silenceData = Buffer.alloc(2048, 0);
  const wavFile = Buffer.concat([wavHeader, silenceData]);

  fs.writeFileSync(testAudioPath, wavFile);
  console.log('✅ Fichier audio de test créé:', testAudioPath);
  console.log('   Taille:', fs.statSync(testAudioPath).size, 'bytes');

  try {
    // 3. Test de l'API Whisper
    console.log('\n🚀 Test de l\'API OpenAI Whisper...');

    const formData = new FormData();

    // MÉTHODE CORRECTE pour Node.js
    formData.append('file', fs.createReadStream(testAudioPath), {
      filename: 'test-audio.wav',
      contentType: 'audio/wav'
    });

    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'verbose_json');

    console.log('📤 Envoi de la requête...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('📨 Statut de la réponse:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ERREUR API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      // Analyser les erreurs communes
      if (response.status === 400) {
        console.log('🔍 Erreur 400: Problème de format ou paramètres');
      } else if (response.status === 401) {
        console.log('🔍 Erreur 401: Clé API invalide');
      } else if (response.status === 413) {
        console.log('🔍 Erreur 413: Fichier trop volumineux (>25MB)');
      }
    } else {
      const result = await response.json();
      console.log('✅ SUCCÈS! Réponse de Whisper:');
      console.log('   Langue détectée:', result.language);
      console.log('   Durée:', result.duration + 's');
      console.log('   Texte:', result.text || '(silence)');
      console.log('   Segments:', result.segments?.length || 0);
    }

  } catch (error) {
    console.error('❌ ERREUR lors du test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Nettoyer le fichier de test
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
      console.log('🧹 Fichier de test supprimé');
    }
  }
}

// Exécuter le test
testWhisperAPI().catch(console.error);