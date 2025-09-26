#!/usr/bin/env node

/**
 * Test de la logique de retry avec différents formats
 * Pour valider que le système tente automatiquement plusieurs formats
 */

require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Simulation de la logique de retry
async function testRetryLogic() {
  console.log('🔄 TEST DE LA LOGIQUE DE RETRY');
  console.log('==============================');

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante');
    return;
  }

  // Créer un fichier WAV valide de 1 seconde
  const sampleRate = 16000;
  const duration = 1;
  const samples = sampleRate * duration;

  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x7D, 0x00, 0x00, // File size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Format chunk size
    0x01, 0x00,             // Audio format (PCM)
    0x01, 0x00,             // Channels (1)
    0x80, 0x3E, 0x00, 0x00, // Sample rate (16000)
    0x00, 0x7D, 0x00, 0x00, // Byte rate
    0x02, 0x00,             // Block align
    0x10, 0x00,             // Bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x7D, 0x00, 0x00  // Data size
  ]);

  // Générer un bip simple
  const audioData = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const amplitude = Math.sin(2 * Math.PI * 440 * time) * 0.3;
    const sample = Math.round(amplitude * 32767);
    audioData.writeInt16LE(sample, i * 2);
  }

  const testFile = Buffer.concat([wavHeader, audioData]);
  const testFilePath = './test-retry.wav';
  fs.writeFileSync(testFilePath, testFile);

  console.log('✅ Fichier audio créé pour test retry');

  // Simuler la logique de retry comme dans le code React Native
  const originalExtension = '.mp4'; // Simuler un fichier MP4
  const isVideoFormat = ['.mp4', '.mov', '.mpeg'].includes(originalExtension);

  const attempts = [
    // Tentative 1: Format original (échouera car on simule MP4 non compatible)
    { mimeType: 'video/mp4', fileName: 'video.mp4', description: 'format original MP4' },
    // Tentative 2: Audio MP4
    ...(isVideoFormat ? [
      { mimeType: 'audio/mp4', fileName: 'video.m4a', description: 'audio MP4' },
      { mimeType: 'audio/mpeg', fileName: 'video.mp3', description: 'audio MPEG' },
      { mimeType: 'audio/wav', fileName: 'video.wav', description: 'audio WAV' } // Celui-ci devrait marcher
    ] : [])
  ];

  console.log(`\n🔄 Testing ${attempts.length} different formats...\n`);

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    console.log(`🔄 Tentative ${i + 1}/${attempts.length}: ${attempt.description}`);

    try {
      const formData = new FormData();

      // Pour les 3 premières tentatives, utiliser un fichier factice qui échouera
      // Pour la dernière (WAV), utiliser le vrai fichier qui marche
      const useRealFile = attempt.mimeType === 'audio/wav';

      if (useRealFile) {
        formData.append('file', fs.createReadStream(testFilePath), {
          filename: attempt.fileName,
          contentType: attempt.mimeType
        });
      } else {
        // Créer un fichier factice qui échouera
        const fakeData = Buffer.from('fake video data');
        formData.append('file', fakeData, {
          filename: attempt.fileName,
          contentType: attempt.mimeType
        });
      }

      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');

      console.log('   📤 Envoi à OpenAI...');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Échec: ${response.status} - ${errorText.substring(0, 100)}...`);

        if (errorText.includes('Invalid file format') && i < attempts.length - 1) {
          console.log('   🔄 Format non supporté, tentative suivante...\n');
          continue;
        } else {
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }
      } else {
        const result = await response.json();
        console.log(`   ✅ SUCCÈS avec ${attempt.description}!`);
        console.log(`   📝 Résultat: "${result.text}"`);
        console.log(`   🌍 Langue: ${result.language}`);
        console.log(`   ⏱️ Durée: ${result.duration}s`);

        console.log('\n🎉 RETRY LOGIC VALIDATED!');
        console.log(`Réussi à la tentative ${i + 1}/${attempts.length} avec format: ${attempt.description}`);
        break;
      }

    } catch (error) {
      console.log(`   ❌ Erreur tentative ${i + 1}: ${error.message}`);
      lastError = error;

      if (!error.message.includes('Invalid file format')) {
        console.log('   🛑 Erreur non-format, arrêt du retry');
        break;
      }
    }

    if (i === attempts.length - 1) {
      console.log('\n❌ TOUTES LES TENTATIVES ONT ÉCHOUÉ');
      console.log('Dernière erreur:', lastError?.message);
    }
  }

  // Nettoyage
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Fichier de test supprimé');
  }
}

testRetryLogic().catch(console.error);