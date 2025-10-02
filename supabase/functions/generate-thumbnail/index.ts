import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { video_id, file_path, duration } = await req.json();

    console.log(`🎬 Generating 6 animated frames for video ${video_id} at ${file_path}`);
    console.log(`⏱️ Video duration: ${duration}s`);

    // Download the video from Supabase Storage
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(file_path);

    if (downloadError) {
      console.error('❌ Error downloading video:', downloadError);
      throw new Error(`Failed to download video: ${downloadError.message}`);
    }

    console.log('✅ Video downloaded successfully');

    // Save video to temp file for FFmpeg processing
    const videoBlob = videoData;
    const videoArrayBuffer = await videoBlob.arrayBuffer();
    const videoPath = `/tmp/video_${video_id}.mp4`;
    await Deno.writeFile(videoPath, new Uint8Array(videoArrayBuffer));

    console.log(`💾 Video saved to: ${videoPath}`);

    // Generate 6 frames at different timestamps
    const frameCount = 6;
    const durationMs = duration * 1000;
    const frameUrls: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      const baseTime = (durationMs / (frameCount + 1)) * (i + 1);
      const randomOffset = (Math.random() - 0.5) * 1000; // ±500ms
      const frameTimeMs = Math.floor(Math.max(500, Math.min(durationMs - 500, baseTime + randomOffset)));
      const frameTimeSec = frameTimeMs / 1000;

      console.log(`📸 Extracting frame ${i + 1} at ${frameTimeSec.toFixed(2)}s...`);

      const framePath = `/tmp/frame_${video_id}_${i}.jpg`;

      // Use FFmpeg to extract frame
      const ffmpegCmd = new Deno.Command("ffmpeg", {
        args: [
          "-ss", frameTimeSec.toFixed(2),
          "-i", videoPath,
          "-vframes", "1",
          "-q:v", "5", // Quality (2-31, lower is better)
          "-y",
          framePath
        ],
        stdout: "null",
        stderr: "null"
      });

      const process = ffmpegCmd.spawn();
      const status = await process.status;

      if (!status.success) {
        console.error(`❌ FFmpeg failed for frame ${i + 1}`);
        continue;
      }

      console.log(`✅ Frame ${i + 1} extracted`);

      // Read the frame file
      const frameData = await Deno.readFile(framePath);

      // Upload frame to Supabase Storage
      const frameFileName = `thumbnail_${Date.now()}_frame${i}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(frameFileName, frameData, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ Error uploading frame ${i + 1}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(frameFileName);

      frameUrls.push(urlData.publicUrl);
      console.log(`✅ Frame ${i + 1} uploaded: ${urlData.publicUrl}`);

      // Clean up frame file
      await Deno.remove(framePath);
    }

    // Clean up video file
    await Deno.remove(videoPath);

    if (frameUrls.length === 0) {
      throw new Error('Failed to generate any frames');
    }

    // Update video record with frames
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        thumbnail_path: frameUrls[0],
        thumbnail_frames: frameUrls
      })
      .eq('id', video_id);

    if (updateError) {
      console.error('❌ Error updating video record:', updateError);
      throw new Error(`Failed to update video record: ${updateError.message}`);
    }

    console.log(`✅ All ${frameUrls.length} frames generated and saved`);

    return new Response(JSON.stringify({
      success: true,
      thumbnail_path: frameUrls[0],
      thumbnail_frames: frameUrls,
      frame_count: frameUrls.length,
      message: `${frameUrls.length} animated frames generated successfully`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Thumbnail generation failed:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

/* Deno.json dependencies:
{
  "tasks": {
    "start": "deno run --allow-all --watch=static/,routes/ dev.ts"
  },
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
*/