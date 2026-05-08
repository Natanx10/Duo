import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://nbrclmquepvudugdlclx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmNsbXF1ZXB2dWR1Z2RsY2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjgwMTUsImV4cCI6MjA5MzYwNDAxNX0.5j4BLFTLoaNQQJUuqmkGMUrlyg4C4Hv-A-LzWeknjvY'
);
async function test() {
  // Test every single field sent by createHabit
  const fields = ['user_id','title','color','days_of_week','is_active','couple_id','description','target_per_day','icon','is_shared','created_at','updated_at','id'];
  console.log('=== HABITS (all fields) ===');
  for (const f of fields) {
    const { error } = await supabase.from('habits').select(f).limit(0);
    console.log(error ? `  ❌ ${f}: ${error.code} - ${error.message}` : `  ✅ ${f}`);
  }
  
  // Now test the EXACT payload createHabit sends — insert without auth to see error
  console.log('\n=== TEST INSERT (no auth, expect RLS error) ===');
  const testPayload = {
    user_id: '00000000-0000-0000-0000-000000000000',
    title: 'Test',
    color: '#6366f1',
    days_of_week: [0,1,2,3,4,5,6],
    is_active: true,
    couple_id: null,
    description: null,
    target_per_day: 1,
  };
  const { data, error } = await supabase.from('habits').insert(testPayload).select().single();
  console.log('Insert result:', error ? `ERROR ${error.code}: ${error.message} | ${error.details} | ${error.hint}` : data);
}
test().catch(console.error);
