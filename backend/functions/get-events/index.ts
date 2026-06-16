import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
    const cors = handleCors(req)
  if (cors) return cors
  try {
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, description, category, poster_url, banner_url, trailer_url, status')
      .eq('status', 'Published')
      .order('created_at', { ascending: false })
    if (error) throw error
    return corsResponse(events)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
