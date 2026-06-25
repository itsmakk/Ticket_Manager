import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { ticket_id } = await req.json()
    if (!ticket_id) throw new Error('ticket_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profileError || !profile) throw new Error('Unauthorized')
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('ticket_id, show_seat_id, verification_token, status, bookings:booking_id(user_id, event_id, show_id, total_amount, status, customer_name, events:event_id(title), shows:show_id(show_date, start_time))')
      .eq('ticket_id', ticket_id)
      .single()
    if (error || !ticket) throw new Error('Ticket not found')
    const isVerificationStaff = profile.role === 'admin' || profile.role === 'scanner'
    if (ticket.bookings?.user_id !== userId && !isVerificationStaff) throw new Error('Unauthorized')
    let seatInfo = null
    if (ticket.show_seat_id) {
      const { data: seat } = await supabase
        .from('show_seats')
        .select('id, auditorium_seats!inner(seat_number, row_label, category)')
        .eq('id', ticket.show_seat_id)
        .single()
      if (seat) {
        seatInfo = { seat_number: seat.auditorium_seats?.seat_number, row_label: seat.auditorium_seats?.row_label, category: seat.auditorium_seats?.category }
      }
    }
    let customerName = ticket.bookings?.customer_name || null
    if (!customerName) {
      const { data: bp } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticket.bookings?.user_id)
        .maybeSingle()
      customerName = bp?.full_name || null
    }
    return corsResponse({
      ticket_id: ticket.ticket_id, status: ticket.status,
      booking_id: ticket.bookings?.booking_id,
      event_title: ticket.bookings?.events?.title,
      show_date: ticket.bookings?.shows?.show_date,
      show_time: ticket.bookings?.shows?.start_time,
      total_amount: ticket.bookings?.total_amount,
      customer_name: customerName,
      verification_token: ticket.verification_token,
      seat: seatInfo,
    })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
