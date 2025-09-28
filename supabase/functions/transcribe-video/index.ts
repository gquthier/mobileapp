// Edge Function - VERSION MINIMALISTE POUR DEBUG
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  videoId: string;
  storageFilePath: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let videoId: string;

  try {
    console.log('🚀 DEBUG: Starting minimal transcription function');

    const { videoId: reqVideoId, storageFilePath, language = 'fr' }: TranscriptionRequest = await req.json();
    videoId = reqVideoId;

    console.log('📋 DEBUG: Request received:', { videoId, storageFilePath, language });

    // Authentification simplifiée
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('🔧 DEBUG: Creating Supabase client');
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'User not found'}`);
    }

    console.log('✅ DEBUG: User authenticated:', user.id);

    // DEBUG: Lister les fichiers dans le bucket
    console.log('📂 DEBUG: Listing all files in videos bucket...');
    const { data: fileList, error: listError } = await supabaseClient.storage
      .from('videos')
      .list('', { limit: 50 });

    if (listError) {
      console.error('❌ DEBUG: Error listing files:', listError);
    } else {
      console.log('📂 DEBUG: Found files in bucket:', fileList?.length);
      fileList?.forEach((file, index) => {
        console.log(`📄 DEBUG: File ${index + 1}: ${file.name} (${file.metadata?.size || 'unknown size'} bytes)`);
      });
    }

    // DEBUG: Chercher le fichier spécifique
    const targetFile = fileList?.find(f => f.name === storageFilePath);
    if (targetFile) {
      console.log('✅ DEBUG: Target file found:', {
        name: targetFile.name,
        size: targetFile.metadata?.size,
        updated: targetFile.updated_at
      });
    } else {
      console.log('❌ DEBUG: Target file NOT FOUND. Looking for:', storageFilePath);
      console.log('📋 DEBUG: Available files:', fileList?.map(f => f.name).slice(0, 10));
    }

    // DEBUG: Tenter le téléchargement
    console.log('📥 DEBUG: Attempting to download file:', storageFilePath);
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('videos')
      .download(storageFilePath);

    console.log('📋 DEBUG: Download attempt result:', {
      hasError: !!downloadError,
      errorMessage: downloadError?.message,
      hasData: !!fileData,
      dataSize: fileData?.size,
      dataType: fileData?.type
    });

    if (downloadError) {
      console.error('❌ DEBUG: Download failed:', downloadError);
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error('No file data received');
    }

    console.log('📊 DEBUG: File downloaded successfully:', {
      size: fileData.size,
      type: fileData.type
    });

    // DEBUG: Si le fichier est petit, lire le contenu
    if (fileData.size < 2000) {
      console.log('⚠️ DEBUG: File is small, reading content...');
      try {
        const content = await fileData.text();
        console.log('📄 DEBUG: File content preview:', content.substring(0, 300));
      } catch (contentError) {
        console.log('❌ DEBUG: Could not read content as text:', contentError.message);
      }
    }

    // Pour l'instant, juste retourner les infos de debug
    return new Response(
      JSON.stringify({
        success: true,
        debug: true,
        message: 'File download test completed',
        fileInfo: {
          path: storageFilePath,
          size: fileData.size,
          type: fileData.type,
          found: !!targetFile,
          expectedSize: targetFile?.metadata?.size
        },
        bucketFiles: fileList?.map(f => ({ name: f.name, size: f.metadata?.size })).slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 DEBUG: Function failed:', error);
    console.error('💥 DEBUG: Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });

    return new Response(
      JSON.stringify({
        success: false,
        debug: true,
        error: error.message,
        errorType: error.name,
        videoId: videoId || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});