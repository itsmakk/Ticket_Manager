import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

// v2 - getUser now async, returns UUID from JWT
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, events:event_id(title), shows:show_id(show_date, start_time), tickets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    for (const booking of (bookings || [])) {
      for (const ticket of (booking.tickets || [])) {
        if (ticket.show_seat_id) {
          const { data: s } = await supabase.from('show_seats').select('auditorium_seats!inner(seat_number, row_label, category)').eq('id', ticket.show_seat_id).maybeSingle()
          ticket.seat = s?.auditorium_seats || null
        }
      }
    }
    return corsResponse(bookings)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
