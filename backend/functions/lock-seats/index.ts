import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { show_id, seat_ids } = await req.json()
    if (!show_id || !seat_ids?.length) throw new Error('show_id and seat_ids required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // Check seats are available and not expired-locked
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
    // Clean expired locks
    await supabase.rpc('cleanup_expired_locks')
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
