import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { event_id } = await req.json()
    if (!event_id) throw new Error('event_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: shows, error } = await supabase.from('shows').select('*').eq('event_id', event_id).order('show_date', { ascending: true }).order('start_time', { ascending: true })
    if (error) throw error
    return new Response(JSON.stringify(shows), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
