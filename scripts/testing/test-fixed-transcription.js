#!/usr/bin/env node

/**
 * Test des corrections apportées au service de transcription
 * Simule l'environnement React Native avec les corrections
 */

require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Simuler le code corrigé de TranscriptionService
async function testCorrectedTranscription() {
  console.log('🛠️ TEST DES CORRECTIONS DE TRANSCRIPTION');
  console.log('==========================================');

  // 1. Vérifier la clé API
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante');
    return;
  }
  console.log('✅ API key available:', !!apiKey);

  // 2. Créer un fichier WAV valide minimal pour test
  console.log('\n🎵 Création d\'un fichier WAV de test valide...');

  // WAV header correct pour 1 seconde de silence à 16kHz mono
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x08, 0x00, 0x00, // File size
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
    0x00, 0x08, 0x00, 0x00  // Data size
  ]);

  const silenceData = Buffer.alloc(2048, 0);
  const testFile = Buffer.concat([wavHeader, silenceData]);
  const testFilePath = './test-corrected.wav';

  fs.writeFileSync(testFilePath, testFile);
  console.log('✅ Fichier WAV créé:', testFilePath, '| Taille:', testFile.length, 'bytes');

  try {
    // 3. Appliquer les corrections identifiées

    // CORRECTION 1: Détection MIME type
    const originalExtension = '.wav';
    const mimeTypeMap = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.m4a': 'audio/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webm': 'video/webm',
    };
    const mimeType = mimeTypeMap[originalExtension] || 'video/mp4';
    const fileName = `video${originalExtension}`;

    console.log('📄 MIME Type:', mimeType, '| Filename:', fileName);

    // CORRECTION 2: FormData correct pour React Native (simulé)
    const formData = new FormData();

    // En React Native, on utilise { uri, type, name }
    // En Node.js, on simule avec createReadStream
    formData.append('file', fs.createReadStream(testFilePath), {
      filename: fileName,
      contentType: mimeType
    });

    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.2');

    console.log('📦 FormData configuré avec les corrections');

    // CORRECTION 3: Headers sans Content-Type explicite
    console.log('📤 Envoi à OpenAI avec headers corrigés...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // CORRECTION: Pas de Content-Type explicite avec FormData
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('📨 Response status:', response.status, response.statusText);

    // CORRECTION 4: Gestion d'erreurs améliorée
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OPENAI API ERROR:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        mimeType: mimeType,
        fileName: fileName,
      });

      // Diagnostics spécifiques
      let errorMessage = `OpenAI API Error ${response.status}`;
      if (response.status === 400) {
        errorMessage += ': Invalid file format or parameters. ';
        if (errorText.includes('format is not supported')) {
          errorMessage += 'File format not supported by Whisper API.';
        } else if (errorText.includes('could not be decoded')) {
          errorMessage += 'File is corrupted or not a valid media file.';
        }
      } else if (response.status === 401) {
        errorMessage += ': Invalid or expired API key.';
      } else if (response.status === 413) {
        errorMessage += ': File too large (max 25MB).';
      } else if (response.status === 429) {
        errorMessage += ': Rate limit exceeded. Please wait and try again.';
      }

      console.error('💡 Diagnostic:', errorMessage);
    } else {
      const result = await response.json();
      console.log('🎉 TRANSCRIPTION RÉUSSIE AVEC LES CORRECTIONS !');
      console.log('✅ Résultat:', {
        language: result.language,
        duration: result.duration + 's',
        textLength: result.text.length,
        segments: result.segments?.length || 0
      });
      console.log('📝 Texte:', result.text || '(silence détecté)');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    // Nettoyer
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Fichier de test supprimé');
    }
  }

  console.log('\n🏁 Test des corrections terminé');
}

testCorrectedTranscription().catch(console.error);