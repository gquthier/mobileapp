#!/usr/bin/env node

/**
 * Test simple avec un fichier audio de test local
 * Pour identifier le problème exact de l'API Whisper
 */

require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function createTestAudioFile() {
  console.log('🎵 Création d\'un fichier audio MP3 de test...');

  // Créer un fichier MP3 minimal valide (silence de 1 seconde)
  // Header MP3 basique + données de silence
  const mp3Header = Buffer.from([
    // Synchronisation MP3
    0xFF, 0xFB, 0x90, 0x00,
    // Frame MP3 (44.1kHz, mono, 128kbps)
    ...Array(100).fill(0x00) // Données audio (silence)
  ]);

  const testFilePath = './test-audio-simple.mp3';
  fs.writeFileSync(testFilePath, mp3Header);

  console.log('✅ Fichier créé:', testFilePath, '| Taille:', fs.statSync(testFilePath).size, 'bytes');
  return testFilePath;
}

async function testSimpleAudio() {
  console.log('🧪 TEST SIMPLE API WHISPER');
  console.log('============================');

  // 1. Vérifier la clé API
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante');
    return;
  }
  console.log('✅ Clé API OK:', apiKey.substring(0, 15) + '...');

  // 2. Créer un fichier audio de test
  const audioFile = await createTestAudioFile();

  try {
    // 3. Test avec FormData (méthode Node.js)
    console.log('\n📦 Préparation FormData...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile), {
      filename: 'test.mp3',
      contentType: 'audio/mpeg'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    console.log('📤 Envoi à OpenAI...');

    // 4. Requête API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('📨 Réponse:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ ERREUR API:', error);

      // Test de validation de la clé API
      console.log('\n🔍 Test de validation de la clé API...');
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (testResponse.ok) {
        console.log('✅ Clé API valide');
        console.log('❌ Problème avec le fichier ou les paramètres');
      } else {
        console.log('❌ Clé API invalide');
      }
    } else {
      const result = await response.json();
      console.log('🎉 SUCCÈS!');
      console.log('Résultat:', result);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    // Nettoyer
    if (fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile);
      console.log('🧹 Fichier de test supprimé');
    }
  }
}

testSimpleAudio().catch(console.error);