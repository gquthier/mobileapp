import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VideoRecord {
  id: string;
  file_path: string;
  thumbnail_path?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { video_id, file_path } = await req.json()

    console.log(`🎬 Generating thumbnail for video ${video_id} at ${file_path}`)

    // Download the video from Supabase Storage
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(file_path)

    if (downloadError) {
      console.error('❌ Error downloading video:', downloadError)
      throw new Error(`Failed to download video: ${downloadError.message}`)
    }

    // Convert video to ArrayBuffer
    const videoBuffer = await videoData.arrayBuffer()

    // Generate thumbnail using a simplified approach
    // For now, we'll create a placeholder thumbnail
    // In production, you'd use FFmpeg or a video processing service
    const thumbnailPath = file_path.replace(/\.(mp4|mov|avi|mkv)$/i, '_thumb.jpg')

    // Create a simple placeholder thumbnail (1x1 pixel image)
    // In production, extract actual frame from video
    const placeholderThumbnail = await generatePlaceholderThumbnail()

    // Upload thumbnail to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(thumbnailPath, placeholderThumbnail, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Error uploading thumbnail:', uploadError)
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`)
    }

    // Update video record with thumbnail path
    const { error: updateError } = await supabase
      .from('videos')
      .update({ thumbnail_path: thumbnailPath })
      .eq('id', video_id)

    if (updateError) {
      console.error('❌ Error updating video record:', updateError)
      throw new Error(`Failed to update video record: ${updateError.message}`)
    }

    console.log(`✅ Thumbnail generated successfully: ${thumbnailPath}`)

    return new Response(
      JSON.stringify({
        success: true,
        thumbnail_path: thumbnailPath,
        message: 'Thumbnail generated successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ Thumbnail generation failed:', error)

    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

async function generatePlaceholderThumbnail(): Promise<Uint8Array> {
  // Create a simple 200x200 gray placeholder image
  // This is a minimal JPEG header + data for a gray square
  const width = 200
  const height = 200

  // For a real implementation, you would use FFmpeg WebAssembly or a video processing service
  // This creates a simple placeholder
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!

  // Fill with gray background
  ctx.fillStyle = '#CCCCCC'
  ctx.fillRect(0, 0, width, height)

  // Add play icon in center
  ctx.fillStyle = '#666666'
  ctx.beginPath()
  const centerX = width / 2
  const centerY = height / 2
  const size = 40

  // Draw triangle (play button)
  ctx.moveTo(centerX - size/2, centerY - size/2)
  ctx.lineTo(centerX + size/2, centerY)
  ctx.lineTo(centerX - size/2, centerY + size/2)
  ctx.closePath()
  ctx.fill()

  // Convert to blob then to array buffer
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
  const arrayBuffer = await blob.arrayBuffer()

  return new Uint8Array(arrayBuffer)
}

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