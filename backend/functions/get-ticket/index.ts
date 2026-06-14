import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { ticket_id } = await req.json()
    if (!ticket_id) throw new Error('ticket_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, bookings:booking_id(event_id, show_id, total_amount, status, events:event_id(title), shows:show_id(show_date, start_time)), bookings:booking_id(booking_seats(seat_number))')
      .eq('ticket_id', ticket_id)
      .single()
    if (error || !ticket) throw new Error('Ticket not found')
    return new Response(JSON.stringify({ ticket_id: ticket.ticket_id, status: ticket.status, event_title: ticket.bookings?.events?.title, show_date: ticket.bookings?.shows?.show_date, show_time: ticket.bookings?.shows?.start_time, seats: (ticket.bookings?.booking_seats || []).map(s => s.seat_number).join(', ') }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
