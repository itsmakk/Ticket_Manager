import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, show_id, event_id, seats, total_amount, discount_amount, promo_code_id, booking_source, customer_name, customer_mobile, customer_email } = await req.json()
    if (!show_id || !seats?.length || !userId) throw new Error('Missing required fields')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    if (razorpay_order_id !== 'free' && razorpay_order_id !== 'counter') {
      const key = Deno.env.get('RAZORPAY_KEY_SECRET')!
      const text = razorpay_order_id + '|' + razorpay_payment_id
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(text))
      const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (expected !== razorpay_signature) throw new Error('Payment verification failed')
    }
    const bookingId = crypto.randomUUID()
    const { error: be } = await supabase.from('bookings').insert({
      id: bookingId, user_id: userId, event_id, show_id, total_amount: parseFloat(total_amount),
      discount_amount: parseFloat(discount_amount || '0'), promo_code_id, status: 'Confirmed', booking_source: booking_source || 'USER',
      customer_name, customer_mobile, customer_email,
    })
    if (be) throw be
    const seatIds = seats.map(s => s.seat_id)
    const { error: sue } = await supabase.from('seats').update({ status: 'booked', locked_at: null, booking_id: bookingId }).in('id', seatIds)
    if (sue) throw sue
    const bookingSeats = seats.map(s => ({ booking_id: bookingId, seat_id: s.seat_id, seat_number: s.seat_number || '', category: s.category }))
    const { error: bse } = await supabase.from('booking_seats').insert(bookingSeats)
    if (bse) throw bse
    const tickets = seats.map(s => ({
      booking_id: bookingId, ticket_id: crypto.randomUUID(), seat_id: s.seat_id,
      verification_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
    }))
    const { error: te } = await supabase.from('tickets').insert(tickets)
    if (te) throw te
    if (promo_code_id) await supabase.rpc('increment_promo_usage', { promo_id: promo_code_id })
    await supabase.from('audit_logs').insert({
      user_id: userId, action: 'BOOKING_CREATED', entity_type: 'booking', entity_id: bookingId,
      details: `Booking ${bookingId.slice(0, 8)} for ${seats.length} seats, amount ₹${total_amount}`,
    })
    return corsResponse({ booking_id: bookingId, success: true, tickets: tickets.map(t => ({ ticket_id: t.ticket_id, token: t.verification_token })) })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
