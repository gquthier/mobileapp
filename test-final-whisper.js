#!/usr/bin/env node

/**
 * Test final avec un fichier audio valide parlé pour valider
 * que les corrections fonctionnent avec un vrai cas d'usage
 */

require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Test avec un fichier audio parlé (synthèse vocale simple)
async function testFinalWhisper() {
  console.log('🎯 TEST FINAL - WHISPER API AVEC CORRECTIONS');
  console.log('==============================================');

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante');
    return;
  }

  // Créer un fichier WAV avec 2 secondes de bip (fréquence simple)
  // Cela simulera un enregistrement audio valide
  console.log('🎵 Création d\'un fichier audio de 2 secondes...');

  const sampleRate = 16000;
  const duration = 2; // secondes
  const samples = sampleRate * duration;

  // Header WAV pour 2 secondes à 16kHz mono
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x7D, 0x00, 0x00, // File size (calculé)
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

  // Générer un bip simple (onde sinusoïdale à 440Hz)
  const frequency = 440; // La note A
  const audioData = Buffer.alloc(samples * 2); // 16-bit samples

  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const amplitude = Math.sin(2 * Math.PI * frequency * time) * 0.3; // 30% volume
    const sample = Math.round(amplitude * 32767); // 16-bit signed

    audioData.writeInt16LE(sample, i * 2);
  }

  const testFile = Buffer.concat([wavHeader, audioData]);
  const testFilePath = './test-final.wav';
  fs.writeFileSync(testFilePath, testFile);

  const fileSizeMB = testFile.length / 1024 / 1024;
  console.log('✅ Fichier audio créé:', {
    path: testFilePath,
    size: `${fileSizeMB.toFixed(3)}MB`,
    duration: duration + 's',
    sampleRate: sampleRate + 'Hz'
  });

  try {
    // Test avec toutes les corrections appliquées
    const formData = new FormData();

    formData.append('file', fs.createReadStream(testFilePath), {
      filename: 'audio_test.wav',
      contentType: 'audio/wav'
    });

    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'verbose_json');

    console.log('\n📤 Test avec les corrections appliquées...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('📨 Statut:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API:', errorText);

      // Essayons sans spécifier la langue
      console.log('\n🔄 Nouvel essai sans spécifier la langue...');

      const formData2 = new FormData();
      formData2.append('file', fs.createReadStream(testFilePath), {
        filename: 'audio_test.wav',
        contentType: 'audio/wav'
      });
      formData2.append('model', 'whisper-1');

      const response2 = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData2.getHeaders()
        },
        body: formData2
      });

      if (response2.ok) {
        const result = await response2.json();
        console.log('🎉 SUCCÈS avec auto-détection !');
        console.log(result);
      } else {
        const error2 = await response2.text();
        console.error('❌ Échec aussi sans langue:', error2);
      }

    } else {
      const result = await response.json();
      console.log('🎉 TRANSCRIPTION RÉUSSIE !');
      console.log('✅ Résultat complet:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Fichier de test supprimé');
    }
  }
}

testFinalWhisper().catch(console.error);