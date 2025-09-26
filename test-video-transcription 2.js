#!/usr/bin/env node

/**
 * Test de transcription de vidéo depuis URL avec l'API OpenAI Whisper
 * Simule exactement le processus de votre application mobile
 */

require('dotenv').config();
const fetch = require('node-fetch'); // npm install node-fetch@2
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testVideoTranscriptionFromURL() {
  console.log('🎬 TEST DE TRANSCRIPTION VIDÉO DEPUIS URL');
  console.log('==========================================');

  // 1. Vérifier la clé API
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Clé OpenAI manquante dans .env');
    console.log('💡 Ajoutez: EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...');
    return;
  }
  console.log('✅ Clé API trouvée:', apiKey.substring(0, 15) + '...');

  // 2. URL de test - vidéo courte publique
  // Vous pouvez remplacer par l'URL de votre vidéo Supabase
  const VIDEO_TEST_URLS = [
    // Exemple d'URL publique courte (remplacez par la vôtre)
    'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    // Ou ajoutez directement l'URL de votre vidéo Supabase ici :
    // 'https://votre-projet.supabase.co/storage/v1/object/public/videos/votre-video.mp4'
  ];

  for (const videoUrl of VIDEO_TEST_URLS) {
    console.log('\\n🔗 Test avec URL:', videoUrl);

    try {
      // 3. Télécharger la vidéo (comme fait dans votre app)
      console.log('📥 Téléchargement de la vidéo...');

      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        console.error('❌ Impossible de télécharger la vidéo:', videoResponse.status);
        continue;
      }

      const contentLength = videoResponse.headers.get('content-length');
      const contentType = videoResponse.headers.get('content-type');

      console.log('✅ Vidéo accessible:', {
        status: videoResponse.status,
        contentType: contentType,
        size: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB` : 'unknown'
      });

      // 4. Vérifier la taille (limite 25MB pour OpenAI)
      if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
        console.error('❌ Vidéo trop volumineuse pour OpenAI (>25MB)');
        continue;
      }

      // 5. Obtenir le buffer de la vidéo
      const videoBuffer = await videoResponse.buffer();
      console.log('📁 Vidéo téléchargée:', `${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      // 6. Préparer le FormData (EXACTEMENT comme dans votre code React Native)
      console.log('📦 Préparation du FormData...');

      const formData = new FormData();

      // MÉTHODE CORRECTE pour envoyer un buffer comme fichier
      formData.append('file', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });

      formData.append('model', 'whisper-1');
      formData.append('language', 'fr'); // Français comme dans votre app
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0.2');

      console.log('📤 Envoi à l\\'API OpenAI Whisper...');

      // 7. Appel API (identique à votre code)
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      console.log('📨 Réponse OpenAI:', transcriptionResponse.status, transcriptionResponse.statusText);

      // 8. Traiter la réponse
      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('❌ ERREUR OPENAI API:');
        console.error('   Status:', transcriptionResponse.status);
        console.error('   Response:', errorText);

        // Diagnostics spécifiques
        if (transcriptionResponse.status === 400) {
          console.log('🔍 DIAGNOSTIC 400:');
          console.log('   - Vérifiez le format de fichier (MP4/MP3/WAV supportés)');
          console.log('   - Vérifiez que le fichier n\\'est pas corrompu');
          console.log('   - Paramètres FormData incorrects');
        } else if (transcriptionResponse.status === 401) {
          console.log('🔍 DIAGNOSTIC 401: Clé API invalide ou expirée');
        } else if (transcriptionResponse.status === 413) {
          console.log('🔍 DIAGNOSTIC 413: Fichier > 25MB');
        } else if (transcriptionResponse.status === 429) {
          console.log('🔍 DIAGNOSTIC 429: Rate limit atteint');
        }
      } else {
        // SUCCÈS !
        const result = await transcriptionResponse.json();
        console.log('🎉 TRANSCRIPTION RÉUSSIE !');
        console.log('✅ Résultat:');
        console.log('   Langue détectée:', result.language);
        console.log('   Durée:', result.duration + 's');
        console.log('   Longueur du texte:', result.text.length);
        console.log('   Segments:', result.segments?.length || 0);
        console.log('\\n📝 TEXTE TRANSCRIT:');
        console.log('   "' + result.text.substring(0, 200) + '..."');

        if (result.segments && result.segments.length > 0) {
          console.log('\\n⏱️ PREMIERS SEGMENTS:');
          result.segments.slice(0, 3).forEach((segment, i) => {
            console.log(`   ${i+1}. [${segment.start}s-${segment.end}s]: "${segment.text}"`);
          });
        }

        // Sauvegarder le résultat pour debug
        const resultFile = `transcription-result-${Date.now()}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log('\\n💾 Résultat sauvegardé dans:', resultFile);
      }

    } catch (error) {
      console.error('❌ ERREUR GLOBALE:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  console.log('\\n🏁 Test terminé');
}

// Fonction pour tester avec une URL spécifique
async function testWithCustomURL(url) {
  if (!url) {
    console.log('\\n💡 USAGE:');
    console.log('node test-video-transcription.js');
    console.log('ou avec URL spécifique:');
    console.log('node test-video-transcription.js "https://votre-url-video.mp4"');
    return;
  }

  console.log('🎯 Test avec URL personnalisée:', url);
  const originalUrls = VIDEO_TEST_URLS;
  VIDEO_TEST_URLS.length = 0;
  VIDEO_TEST_URLS.push(url);
  await testVideoTranscriptionFromURL();
}

// Point d'entrée
const customUrl = process.argv[2];
if (customUrl) {
  testWithCustomURL(customUrl);
} else {
  testVideoTranscriptionFromURL();
}