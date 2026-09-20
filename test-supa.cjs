const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zuupzzjfxwadutblkncu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dXB6empmeHdhZHV0YmxrbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzQzMjIsImV4cCI6MjEwMzg1MDMyMn0.3Jv6DJAyIo4KceG7mVUdOxTcfFpQSkIlIPXscUkfxRc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    const { data, error } = await supabase.rpc('exec_sql', { query: 'ALTER TABLE avisos_globales ADD COLUMN "mainImageUrl" text; ALTER TABLE avisos_globales ADD COLUMN "videoUrl" text;' });
    console.log("Error:", error);
    console.log("Data:", data);
}
test();
