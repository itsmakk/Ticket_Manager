import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: events, error } = await supabase.from('events').select('*').eq('status', 'Published').order('created_at', { ascending: false })
    if (error) throw error
    return corsResponse(events)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
