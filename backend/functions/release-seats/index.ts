import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { assertOwnedSeatLocks } from '../_shared/resource-authorization.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { show_id, seat_ids } = await req.json()
    if (!show_id || !seat_ids?.length) throw new Error('show_id and seat_ids required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: locks, error: lockError } = await supabase
      .from('seat_locks')
      .select('seat_id, user_id, expires_at')
      .eq('show_id', show_id)
      .in('seat_id', seat_ids)
    if (lockError) throw lockError
    assertOwnedSeatLocks(seat_ids, locks || [], userId)
    const { error } = await supabase.from('show_seats').update({ status: 'available', locked_at: null }).in('id', seat_ids).eq('show_id', show_id)
    if (error) throw error
    await supabase.from('seat_locks').delete().eq('user_id', userId).eq('show_id', show_id).in('seat_id', seat_ids)
    return corsResponse({ success: true })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
