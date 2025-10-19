#!/usr/bin/env node

// Script de diagnostic pour identifier le problème exact de transcription
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

async function testTranscription() {
  console.log('🔍 DIAGNOSTIC DE TRANSCRIPTION');
  console.log('===============================');

  // 1. Vérifier les variables d'environnement
  console.log('1️⃣ Variables d\'environnement:');
  console.log('   Supabase URL:', !!supabaseUrl);
  console.log('   Supabase Key:', !!supabaseKey);
  console.log('   OpenAI Key:', !!openaiKey);
  console.log('   OpenAI Key prefix:', openaiKey ? openaiKey.substring(0, 10) + '...' : 'MANQUANT');

  if (!openaiKey) {
    console.error('❌ Clé OpenAI manquante !');
    return;
  }

  // 2. Récupérer le dernier fichier vidéo de Supabase
  console.log('\n2️⃣ Récupération du dernier fichier vidéo...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !videos || videos.length === 0) {
    console.error('❌ Impossible de récupérer une vidéo:', error);
    return;
  }

  const video = videos[0];
  console.log('✅ Vidéo trouvée:', {
    id: video.id,
    title: video.title,
    file_path: video.file_path,
    duration: video.duration
  });

  // 3. Tester l'accessibilité du fichier
  console.log('\n3️⃣ Test d\'accessibilité du fichier...');
  try {
    const response = await fetch(video.file_path, { method: 'HEAD' });
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Content-Length:', response.headers.get('content-length'));

    if (!response.ok) {
      console.error('❌ Fichier non accessible:', response.status);
      return;
    }
  } catch (error) {
    console.error('❌ Erreur d\'accès au fichier:', error.message);
    return;
  }

  // 4. Télécharger le fichier localement (simulation)
  console.log('\n4️⃣ Test de téléchargement...');
  try {
    const response = await fetch(video.file_path);
    const buffer = await response.arrayBuffer();
    const sizeInMB = buffer.byteLength / (1024 * 1024);

    console.log('✅ Fichier téléchargé avec succès');
    console.log('   Taille:', sizeInMB.toFixed(2) + 'MB');
    console.log('   Limite OpenAI: 25MB');
    console.log('   Dans la limite:', sizeInMB < 25 ? '✅' : '❌');

    if (sizeInMB >= 25) {
      console.error('❌ Fichier trop volumineux pour OpenAI !');
      return;
    }

    // 5. Créer FormData exactement comme dans l'app
    console.log('\n5️⃣ Test de création FormData...');
    const FormData = require('form-data');
    const formData = new FormData();

    // Simuler le fichier comme dans React Native
    formData.append('file', buffer, {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    });

    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    console.log('✅ FormData créé avec succès');

    // 6. Test de l'API OpenAI
    console.log('\n6️⃣ Test de l\'API OpenAI Whisper...');
    const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('   Status API:', apiResponse.status, apiResponse.statusText);
    console.log('   Headers:', Object.fromEntries(apiResponse.headers.entries()));

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ ERREUR API OpenAI:');
      console.error('   Status:', apiResponse.status);
      console.error('   Response:', errorText);

      // Analyser l'erreur
      try {
        const errorJson = JSON.parse(errorText);
        console.error('   Error details:', errorJson);
      } catch (e) {
        console.error('   Raw error:', errorText);
      }
    } else {
      const result = await apiResponse.json();
      console.log('✅ SUCCÈS ! Transcription reçue:');
      console.log('   Langue détectée:', result.language);
      console.log('   Durée:', result.duration);
      console.log('   Longueur du texte:', result.text.length);
      console.log('   Début du texte:', result.text.substring(0, 100) + '...');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testTranscription().catch(console.error);