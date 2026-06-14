import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { show_id, seat_ids } = await req.json()
    if (!show_id || !seat_ids?.length) throw new Error('show_id and seat_ids required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: seats, error: se } = await supabase.from('seats').select('id, status, locked_at').in('id', seat_ids).eq('show_id', show_id)
    if (se) throw se
    const now = new Date().toISOString()
    for (const seat of seats || []) {
      if (seat.status === 'booked') throw new Error(`Seat ${seat.id} is already booked`)
      if (seat.status === 'locked' && seat.locked_at) {
        const elapsed = (new Date(now).getTime() - new Date(seat.locked_at).getTime()) / 1000
        if (elapsed < 300) throw new Error(`Seat ${seat.id} is locked by another user`)
      }
    }
    const { error: ue } = await supabase.from('seats').update({ status: 'locked', locked_at: now }).in('id', seat_ids).eq('show_id', show_id)
    if (ue) throw ue
    await supabase.rpc('cleanup_expired_locks')
    return corsResponse({ success: true })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
