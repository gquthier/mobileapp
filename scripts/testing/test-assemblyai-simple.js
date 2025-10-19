// Simple test to check video URL format in database
const https = require('https');

// Latest video URL from your logs
const correctUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/f4d08915-372f-45fa-9fd2-28da94149398/video_1759961909813_recorded_1759961909642_1822br6lm.mp4';
const wrongUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/video_1759961909813_recorded_1759961909642_1822br6lm.mp4';

console.log('🧪 Testing video URL accessibility...\n');

function testUrl(url, label) {
  return new Promise((resolve) => {
    console.log(`📡 Testing ${label}:`);
    console.log(`   ${url}`);
    
    https.get(url, (res) => {
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ Video accessible!\n');
      } else {
        console.log('   ❌ Video not accessible\n');
      }
      
      resolve(res.statusCode === 200);
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('Testing WRONG URL (without user_id):');
  await testUrl(wrongUrl, 'Wrong URL');
  
  console.log('\nTesting CORRECT URL (with user_id):');
  await testUrl(correctUrl, 'Correct URL');
  
  console.log('\n📊 Conclusion:');
  console.log('The fix (adding user_id to the URL) should resolve the AssemblyAI error.');
}

runTests();
