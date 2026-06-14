import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { show_id, seat_ids } = await req.json()
    if (!show_id || !seat_ids?.length) throw new Error('show_id and seat_ids required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.from('seats').update({ status: 'available', locked_at: null }).in('id', seat_ids).eq('show_id', show_id)
    if (error) throw error
    return corsResponse({ success: true })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
