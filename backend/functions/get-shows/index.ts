import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { event_id } = await req.json()
    if (!event_id) throw new Error('event_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: shows, error } = await supabase.from('shows').select('*').eq('event_id', event_id).order('show_date', { ascending: true }).order('start_time', { ascending: true })
    if (error) throw error
    return corsResponse(shows)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
