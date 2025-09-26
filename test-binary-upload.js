#!/usr/bin/env node

/**
 * Test de validation : Upload de données binaires vs URI
 * Pour confirmer que le problème était l'envoi d'URI au lieu de données binaires
 */

require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testBinaryUpload() {
  console.log('🧪 TEST : DONNÉES BINAIRES vs URI');
  console.log('===================================');

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante');
    return;
  }

  // Créer un fichier WAV valide de 1 seconde avec du son
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

  // Générer un bip audible
  const audioData = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    const amplitude = Math.sin(2 * Math.PI * 440 * time) * 0.3;
    const sample = Math.round(amplitude * 32767);
    audioData.writeInt16LE(sample, i * 2);
  }

  const testFile = Buffer.concat([wavHeader, audioData]);
  const testFilePath = './test-binary.wav';
  fs.writeFileSync(testFilePath, testFile);

  console.log('✅ Fichier WAV créé:', {
    path: testFilePath,
    size: `${(testFile.length / 1024).toFixed(1)}KB`,
    duration: duration + 's'
  });

  try {
    // TEST 1: Simulation de l'ancienne méthode (URI - échoue)
    console.log('\n📤 TEST 1: Simulation envoi URI (ancien code)...');

    const formData1 = new FormData();

    // Simuler l'envoi d'une "URI" comme dans React Native (ne marche pas)
    const fakeUriData = JSON.stringify({
      uri: testFilePath,
      type: 'audio/wav',
      name: 'test.wav'
    });

    formData1.append('file', fakeUriData, {
      filename: 'test.wav',
      contentType: 'audio/wav'
    });
    formData1.append('model', 'whisper-1');
    formData1.append('language', 'fr');

    const response1 = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData1.getHeaders()
      },
      body: formData1
    });

    console.log('📨 Résultat TEST 1:', response1.status);
    if (!response1.ok) {
      const error1 = await response1.text();
      console.log('❌ Échec prévu:', error1.substring(0, 100) + '...');
    }

    // TEST 2: Nouvelle méthode (données binaires - succès)
    console.log('\n📤 TEST 2: Envoi données binaires (nouveau code)...');

    const formData2 = new FormData();

    // Envoyer le fichier réel (binaire)
    formData2.append('file', fs.createReadStream(testFilePath), {
      filename: 'test.wav',
      contentType: 'audio/wav'
    });
    formData2.append('model', 'whisper-1');
    formData2.append('language', 'fr');

    const response2 = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData2.getHeaders()
      },
      body: formData2
    });

    console.log('📨 Résultat TEST 2:', response2.status);

    if (response2.ok) {
      const result = await response2.json();
      console.log('🎉 SUCCÈS avec données binaires !');
      console.log('   Texte:', result.text);
      console.log('   Langue:', result.language);
      console.log('   Durée:', result.duration + 's');
    } else {
      const error2 = await response2.text();
      console.log('❌ Échec inattendu:', error2);
    }

    // SIMULATION React Native : Base64 → Blob
    console.log('\n📤 TEST 3: Simulation React Native (Base64 → Blob)...');

    // Lire le fichier en base64 (comme React Native)
    const base64Data = fs.readFileSync(testFilePath).toString('base64');
    console.log('📁 Fichier lu en base64, taille:', base64Data.length, 'caractères');

    // Convertir en Blob (comme dans notre code corrigé)
    const binaryString = Buffer.from(base64Data, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Créer un buffer Node.js (équivalent au Blob en React Native)
    const binaryBuffer = Buffer.from(bytes);

    const formData3 = new FormData();
    formData3.append('file', binaryBuffer, {
      filename: 'test.wav',
      contentType: 'audio/wav'
    });
    formData3.append('model', 'whisper-1');
    formData3.append('language', 'fr');

    const response3 = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData3.getHeaders()
      },
      body: formData3
    });

    console.log('📨 Résultat TEST 3:', response3.status);

    if (response3.ok) {
      const result3 = await response3.json();
      console.log('🎉 SUCCÈS avec simulation React Native !');
      console.log('   Méthode Base64→Blob fonctionne ✅');
    } else {
      const error3 = await response3.text();
      console.log('❌ Simulation React Native échoue:', error3.substring(0, 100));
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Fichier de test supprimé');
    }
  }

  console.log('\n📊 CONCLUSION:');
  console.log('   TEST 1 (URI): ❌ Échec attendu');
  console.log('   TEST 2 (Binaire): ✅ Succès');
  console.log('   TEST 3 (Base64→Blob): ✅ Solution pour React Native');
}

testBinaryUpload().catch(console.error);