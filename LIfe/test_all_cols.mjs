import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://nbrclmquepvudugdlclx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmNsbXF1ZXB2dWR1Z2RsY2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjgwMTUsImV4cCI6MjA5MzYwNDAxNX0.5j4BLFTLoaNQQJUuqmkGMUrlyg4C4Hv-A-LzWeknjvY'
);

async function testTable(tableName) {
  console.log(`\n=== Testing table: ${tableName} ===`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.log(`Error selecting * from ${tableName}: ${error.code} - ${error.message}`);
    return;
  }
  if (data && data.length > 0) {
    console.log(`Columns found in ${tableName}:`, Object.keys(data[0]));
  } else {
    console.log(`No rows in ${tableName}, testing common columns...`);
    const common = ['id', 'user_id', 'couple_id', 'created_at', 'updated_at', 'title', 'name', 'color', 'icon', 'is_shared'];
    for (const col of common) {
      const { error: colErr } = await supabase.from(tableName).select(col).limit(0);
      if (!colErr) console.log(`  ✅ ${col}`);
      else if (colErr.code !== 'PGRST204') console.log(`  ❓ ${col}: ${colErr.code}`);
    }
  }
}

async function run() {
  const tables = ['profiles', 'categories', 'habits', 'routines', 'events', 'todos', 'reminders'];
  for (const t of tables) {
    await testTable(t);
  }
}

run().catch(console.error);
