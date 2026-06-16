import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { assertResourceCount } from '../_shared/resource-authorization.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { show_id, seat_ids } = await req.json()
    if (!show_id || !seat_ids?.length) throw new Error('show_id and seat_ids required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, status, show_date, start_time, booking_cutoff_minutes, events!inner(status)')
      .eq('id', show_id)
      .eq('events.status', 'Published')
      .in('status', ['Upcoming', 'Active'])
      .single()
    if (showError || !show) throw new Error('Show is not available for booking')
    if (isPastBookingCutoff(show)) throw new Error('Booking cutoff has passed for this show')
    await supabase.rpc('cleanup_expired_locks')
    const { data: seats, error: se } = await supabase.from('show_seats').select('id, status, locked_at').in('id', seat_ids).eq('show_id', show_id)
    if (se) throw se
    assertResourceCount(seat_ids, (seats || []).map(seat => seat.id), 'seat')
    const { data: existingLocks } = await supabase.from('seat_locks').select('seat_id, user_id').eq('show_id', show_id).in('seat_id', seat_ids)
    const existingLockMap = new Map((existingLocks || []).map(l => [l.seat_id, l.user_id]))
    const now = new Date().toISOString()
    for (const seat of seats || []) {
      if (seat.status === 'booked') throw new Error(`Seat ${seat.id} is already booked`)
      if (seat.status === 'locked') {
        const lockOwner = existingLockMap.get(seat.id)
        if (lockOwner && lockOwner !== userId) {
          if (seat.locked_at) {
            const elapsed = (new Date(now).getTime() - new Date(seat.locked_at).getTime()) / 1000
            if (elapsed < 300) throw new Error(`Seat ${seat.id} is locked by another user`)
          }
        }
      }
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const { error: lockError } = await supabase.from('seat_locks').upsert(
      seat_ids.map(seatId => ({
        seat_id: seatId,
        show_id,
        user_id: userId,
        locked_at: now,
        expires_at: expiresAt,
      }), { onConflict: 'seat_id, show_id' }),
    )
    if (lockError) throw new Error('One or more seats were locked by another user')
    const { data: updatedSeats, error: ue } = await supabase.from('show_seats').update({ status: 'locked', locked_at: now }).in('id', seat_ids).eq('show_id', show_id).eq('status', 'available').select('id, status')
    if (ue || !updatedSeats || updatedSeats.length !== seat_ids.length) {
      if (ue) throw ue
      const lockedIds = new Set((updatedSeats || []).map(s => s.id))
      const failedIds = seat_ids.filter(id => !lockedIds.has(id))
      await supabase.from('seat_locks').delete().eq('user_id', userId).eq('show_id', show_id).in('seat_id', failedIds)
      await supabase.from('show_seats').update({ status: 'available', locked_at: null }).in('id', failedIds).eq('show_id', show_id)
      throw new Error('One or more seats were locked by another user')
    }
    return corsResponse({ success: true, expires_at: expiresAt })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
