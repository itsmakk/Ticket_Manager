import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, show_id, event_id, seats, total_amount, discount_amount, promo_code_id, user_id, booking_source } = await req.json()
    if (!show_id || !seats?.length || !user_id) throw new Error('Missing required fields')

    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Verify Razorpay signature (skip for free/counter bookings)
    if (razorpay_order_id !== 'free' && razorpay_order_id !== 'counter') {
      const key = Deno.env.get('RAZORPAY_KEY_SECRET')!
      const text = razorpay_order_id + '|' + razorpay_payment_id
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(text))
      const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (expected !== razorpay_signature) throw new Error('Payment verification failed')
    }

    // Create booking
    const bookingId = crypto.randomUUID()
    const { error: be } = await supabase.from('bookings').insert({
      id: bookingId, user_id, event_id, show_id, total_amount: parseFloat(total_amount), discount_amount: parseFloat(discount_amount || '0'), promo_code_id, status: 'Confirmed', booking_source: booking_source || 'USER',
    })
    if (be) throw be

    // Mark seats as booked
    const seatIds = seats.map(s => s.seat_id)
    const { error: sue } = await supabase.from('seats').update({ status: 'booked', locked_at: null, booking_id: bookingId }).in('id', seatIds)
    if (sue) throw sue

    // Create booking_seats
    const bookingSeats = seats.map(s => ({ booking_id: bookingId, seat_id: s.seat_id, seat_number: s.seat_number || '', category: s.category }))
    const { error: bse } = await supabase.from('booking_seats').insert(bookingSeats)
    if (bse) throw bse

    // Generate tickets
    const tickets = seats.map(s => ({
      booking_id: bookingId, ticket_id: crypto.randomUUID(), seat_id: s.seat_id, verification_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
    }))
    const { error: te } = await supabase.from('tickets').insert(tickets)
    if (te) throw te

    // Update promo code usage
    if (promo_code_id) {
      await supabase.rpc('increment_promo_usage', { promo_id: promo_code_id })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id, action: 'BOOKING_CREATED', entity_type: 'booking', entity_id: bookingId,
      details: `Booking ${bookingId.slice(0, 8)} for ${seats.length} seats, amount ₹${total_amount}`,
    })

    return new Response(JSON.stringify({ booking_id: bookingId, success: true, tickets: tickets.map(t => ({ ticket_id: t.ticket_id, token: t.verification_token })) }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
