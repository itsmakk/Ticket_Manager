import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: events, error } = await supabase.from('events').select('*').eq('status', 'Active').order('created_at', { ascending: false })
    if (error) throw error
    return new Response(JSON.stringify(events), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
