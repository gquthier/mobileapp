import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co';

// ⚠️ IMPORTANT: Pour le dashboard admin, utilisez la clé SERVICE_ROLE
// Cette clé bypass les Row Level Security et donne accès à toutes les données
// Clé récupérée depuis: Supabase Dashboard > Settings > API > service_role key (secret)
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc3NjQ1NywiZXhwIjoyMDc0MzUyNDU3fQ.zFHySMkHzjCIYE86-OGy11QXoUn7-FfJuV0PI8D3cJY';

// Créer le client Supabase avec la service role key pour le dashboard admin
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
