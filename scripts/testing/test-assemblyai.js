// Test script to verify AssemblyAI Edge Function with correct video URL
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAssemblyAI() {
  try {
    console.log('🧪 Testing AssemblyAI Edge Function...');
    
    // Get the latest video from database
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !videos) {
      console.error('❌ Failed to get latest video:', error);
      return;
    }

    console.log('📹 Latest video:', videos.title || videos.id);
    console.log('📁 File path:', videos.file_path);

    // Extract user_id and filename from file_path if it's a storage URL
    let videoUrl = videos.file_path;
    
    // If it's already a full URL, use it
    if (videoUrl.startsWith('http')) {
      console.log('✅ Using existing URL:', videoUrl);
    } else {
      // Construct URL (this shouldn't happen with our new code)
      console.log('⚠️ File path is not a URL, this is unexpected');
      return;
    }

    // Create a test transcription job
    console.log('\n🚀 Creating test transcription job...');
    
    const { data: jobData, error: jobError } = await supabase
      .from('transcription_jobs')
      .insert([{
        video_id: videos.id,
        user_id: videos.user_id,
        status: 'pending',
      }])
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to create job:', jobError);
      return;
    }

    console.log('✅ Test job created:', jobData.id);
    console.log('\n📤 Calling AssemblyAI Edge Function...');
    console.log('   Video URL:', videoUrl);
    console.log('   Job ID:', jobData.id);

    // Call the Edge Function
    const { data, error: invokeError } = await supabase.functions.invoke('transcribe-assemblyai', {
      body: {
        videoUrl: videoUrl,
        jobId: jobData.id,
      }
    });

    if (invokeError) {
      console.error('\n❌ Edge Function error:', invokeError);
      return;
    }

    console.log('\n✅ Edge Function response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('\n💥 Test failed:', error);
  }
}

testAssemblyAI();
