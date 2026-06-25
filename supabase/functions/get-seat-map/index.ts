import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'
import { flattenShowSeat } from '../_shared/show-seats.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { show_id } = await req.json()
    if (!show_id) throw new Error('show_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const { data: show, error: se } = await supabase
      .from('shows')
      .select('id, event_id, show_date, start_time, duration, end_time, status, price_premium, price_gold, price_silver, booking_cutoff_minutes, events!inner(status)')
      .eq('id', show_id)
      .eq('events.status', 'Published')
      .in('status', ['Upcoming', 'Active'])
      .single()
    if (se || !show) throw new Error('Show not found')
    if (isPastBookingCutoff(show)) throw new Error('Booking cutoff has passed for this show')
    const { data: seats, error: ste } = await supabase
      .from('show_seats')
      .select('id, show_id, auditorium_seat_id, status, auditorium_seats!inner(seat_number, row_label, category, is_active)')
      .eq('show_id', show_id)
      .eq('auditorium_seats.is_active', true)
    if (ste) throw ste
    const grouped: Record<string, any[]> = {}
    for (const record of seats || []) {
      const seat = flattenShowSeat(record)
      const row = seat.row_label
      if (!grouped[row]) grouped[row] = []
      grouped[row].push(seat)
    }
    const sortedRows = Object.keys(grouped).sort()
    for (const row of sortedRows) {
      grouped[row].sort((a, b) => {
        const numA = parseInt(a.seat_number.replace(/^[A-Za-z]+/, ''), 10)
        const numB = parseInt(b.seat_number.replace(/^[A-Za-z]+/, ''), 10)
        return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB)
      })
    }
    const ordered: Record<string, any[]> = {}
    for (const row of sortedRows) ordered[row] = grouped[row]
    const { events: _events, ...publicShow } = show
    return corsResponse({ show: publicShow, seats: ordered })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
