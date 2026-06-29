import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { authorizeBookingMode } from '../_shared/booking-authorization.ts'
import { assertOwnedSeatLocks, assertResourceCount } from '../_shared/resource-authorization.ts'
import { shouldRefundLatePayment } from '../_shared/payment-reconciliation.ts'
import { flattenShowSeat } from '../_shared/show-seats.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { isMaintenanceMode } from '../_shared/maintenance.ts'
import { sendEmail, buildConfirmationHtml, generateQRDataUrl } from '../_shared/email.ts'

async function refundRazorpayPayment(paymentId: string) {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')!
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(keyId + ':' + keySecret),
    },
    body: JSON.stringify({ notes: { reason: 'seat_unavailable_after_lock_expiry' } }),
  })
  const refund = await response.json()
  if (!response.ok) throw new Error(refund.error?.description || 'Automatic refund request failed')
  return refund
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, show_id, event_id, seats, total_amount, discount_amount, promo_code_id, payment_mode, customer_name, customer_mobile, customer_email } = await req.json()
    if (!show_id || !seats?.length || !userId) throw new Error('Missing required fields')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (profileError || !profile) throw new Error('Unauthorized')

    const bookingMode = authorizeBookingMode(profile.role, razorpay_order_id, payment_mode)
    if (await isMaintenanceMode(supabase)) {
      if (bookingMode.requiresRazorpayVerification && razorpay_order_id) {
        const { data: existingIntent } = await supabase.from('payment_intents').select('status').eq('razorpay_order_id', razorpay_order_id).maybeSingle()
        if (!existingIntent || existingIntent.status !== 'PENDING') {
          throw new Error('System is under maintenance. New bookings are temporarily unavailable.')
        }
      } else if (!bookingMode.requiresRazorpayVerification) {
        throw new Error('System is under maintenance. New bookings are temporarily unavailable.')
      }
    }
    let paymentIntent = null
    let effectiveEventId = event_id
    let effectiveShowId = show_id
    let effectiveSeatIds = seats.map(s => s.seat_id)
    let effectiveAmount = parseFloat(total_amount)
    let effectiveDiscountAmount = parseFloat(discount_amount || '0')
    let effectivePromoCodeId = promo_code_id

    if (bookingMode.requiresRazorpayVerification) {
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', userId)
        .single()
      if (intentError || !intent) throw new Error('Payment order not found')
      if (intent.status === 'BOOKED' && intent.booking_id) {
        return corsResponse({ booking_id: intent.booking_id, success: true, duplicate: true })
      }
      if (intent.status !== 'PENDING') {
        throw new Error(`Payment order cannot be processed in status ${intent.status}`)
      }
      paymentIntent = intent
      effectiveEventId = intent.event_id
      effectiveShowId = intent.show_id
      effectiveSeatIds = intent.seat_ids
      effectiveAmount = Number(intent.amount)
      effectiveDiscountAmount = Number(intent.discount_amount)
      effectivePromoCodeId = intent.promo_code_id
    }

    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, event_id, status, show_date, start_time, booking_cutoff_minutes, price_premium, price_gold, price_silver, events!inner(status, title)')
      .eq('id', effectiveShowId)
      .eq('event_id', effectiveEventId)
      .single()
    if (showError || !show) throw new Error('Show and event were not found')
    const showIsBookable = show.events?.status === 'Published' && ['Upcoming', 'Active'].includes(show.status) && !isPastBookingCutoff(show)
    if (!bookingMode.requiresRazorpayVerification && !showIsBookable) {
      throw new Error('Show and event are not available for booking')
    }
    const { data: selectedSeatRecords, error: seatError } = await supabase
      .from('show_seats')
      .select('id, show_id, status, auditorium_seats!inner(seat_number, row_label, category, is_active)')
      .eq('show_id', effectiveShowId)
      .in('id', effectiveSeatIds)
      .eq('auditorium_seats.is_active', true)
    if (seatError) throw seatError
    const selectedSeats = (selectedSeatRecords || []).map(flattenShowSeat)
    if (!bookingMode.requiresRazorpayVerification) {
      const validCategories = ['premium', 'gold', 'silver']
      let recalcAmount = 0
      for (const s of selectedSeats) {
        if (!validCategories.includes(s.category)) throw new Error(`Invalid category: ${s.category}`)
        const price = show[`price_${s.category}`]
        if (price === undefined || price === null || isNaN(Number(price))) throw new Error(`Missing price for category: ${s.category}`)
        recalcAmount += Number(price)
      }
      recalcAmount = Math.max(0, recalcAmount - effectiveDiscountAmount)
      effectiveAmount = recalcAmount
    }
    assertResourceCount(effectiveSeatIds, selectedSeats.map(seat => seat.id), 'seat')
    const { data: locks, error: lockError } = await supabase
      .from('seat_locks')
      .select('seat_id, user_id, expires_at')
      .eq('show_id', effectiveShowId)
      .in('seat_id', effectiveSeatIds)
    if (lockError) throw lockError
    if (bookingMode.requiresRazorpayVerification) {
      const key = Deno.env.get('RAZORPAY_KEY_SECRET')!
      const text = razorpay_order_id + '|' + razorpay_payment_id
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(text))
      const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (expected !== razorpay_signature) throw new Error('Payment verification failed')
      const { data: claimedIntent, error: claimError } = await supabase
        .from('payment_intents')
        .update({ status: 'PROCESSING', payment_id: razorpay_payment_id })
        .eq('id', paymentIntent.id)
        .eq('status', 'PENDING')
        .select('id')
        .maybeSingle()
      if (claimError) throw claimError
      if (!claimedIntent) {
        const { data: currentIntent } = await supabase
          .from('payment_intents')
          .select('status, booking_id')
          .eq('id', paymentIntent.id)
          .single()
        if (currentIntent?.status === 'BOOKED' && currentIntent.booking_id) {
          return corsResponse({ booking_id: currentIntent.booking_id, success: true, duplicate: true })
        }
        throw new Error(`Payment is already being processed or is in status ${currentIntent?.status || 'unknown'}`)
      }
      if (!showIsBookable || shouldRefundLatePayment(effectiveSeatIds, selectedSeats, locks || [], userId)) {
        const failureReason = !showIsBookable
          ? 'Show or event became unavailable before payment verification'
          : 'Seats unavailable when successful payment was verified'
        await supabase.from('payment_intents').update({
          status: 'REFUND_PENDING',
          failure_reason: failureReason,
        }).eq('id', paymentIntent.id).eq('status', 'PROCESSING')
        try {
          const refund = await refundRazorpayPayment(razorpay_payment_id)
          await supabase.from('payment_intents').update({
            status: 'REFUNDED',
            refund_id: refund.id,
          }).eq('id', paymentIntent.id)
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'LATE_PAYMENT_REFUNDED',
            entity_type: 'payment_intent',
            entity_id: paymentIntent.id,
            details: `Payment ${razorpay_payment_id} refunded because ${failureReason.toLowerCase()}`,
          })
          return corsResponse({
            error: 'Payment succeeded after the seat reservation expired. A full refund was initiated.',
            code: 'PAYMENT_REFUNDED',
            refund_id: refund.id,
          }, 409)
        } catch (refundError) {
          await supabase.from('payment_intents').update({
            status: 'RECONCILIATION_REQUIRED',
            failure_reason: refundError.message,
          }).eq('id', paymentIntent.id)
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'PAYMENT_RECONCILIATION_REQUIRED',
            entity_type: 'payment_intent',
            entity_id: paymentIntent.id,
            details: `Payment ${razorpay_payment_id}: ${refundError.message}`,
          })
          return corsResponse({
            error: 'Payment succeeded but the seats are unavailable. Manual refund review is required.',
            code: 'RECONCILIATION_REQUIRED',
          }, 409)
        }
      }
    } else {
      if (selectedSeats.some(seat => seat.status !== 'locked')) {
        throw new Error('All selected seats must be locked before payment verification')
      }
      assertOwnedSeatLocks(effectiveSeatIds, locks || [], userId)
    }
    if (effectivePromoCodeId) {
      const { data: promoIncremented } = await supabase.rpc('increment_promo_usage', { promo_id: effectivePromoCodeId }).maybeSingle()
      if (promoIncremented === false) {
        if (bookingMode.requiresRazorpayVerification) {
          await supabase.from('payment_intents').update({
            status: 'RECONCILIATION_REQUIRED',
            failure_reason: 'Promo code usage limit reached; payment requires manual refund',
          }).eq('id', paymentIntent?.id)
        }
        throw new Error('Promo code usage limit has been reached')
      }
    }
    const bookingId = crypto.randomUUID()
    const { error: be } = await supabase.from('bookings').insert({
      id: bookingId, user_id: userId, event_id: effectiveEventId, show_id: effectiveShowId, total_amount: effectiveAmount,
      discount_amount: effectiveDiscountAmount, promo_code_id: effectivePromoCodeId, status: 'Confirmed',
      booking_source: bookingMode.bookingSource, payment_mode: bookingMode.paymentMode,
      payment_id: razorpay_payment_id, razorpay_order_id,
      customer_name, customer_mobile, customer_email,
    })
    if (be) throw be
    const { error: sue } = await supabase.from('show_seats').update({ status: 'booked', locked_at: null, booking_id: bookingId }).in('id', effectiveSeatIds)
    if (sue) throw sue
    const bookingSeats = selectedSeats.map(s => ({ booking_id: bookingId, seat_id: s.id, seat_number: s.seat_number, category: s.category }))
    const { error: bse } = await supabase.from('booking_seats').insert(bookingSeats)
    if (bse) throw bse
    const tickets = selectedSeats.map(s => ({
      booking_id: bookingId, ticket_id: crypto.randomUUID(), show_seat_id: s.id,
      verification_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
    }))
    const { error: te } = await supabase.from('tickets').insert(tickets)
    if (te) throw te
    await supabase.from('seat_locks').delete().eq('user_id', userId).eq('show_id', effectiveShowId).in('seat_id', effectiveSeatIds)
    if (paymentIntent) {
      await supabase.from('payment_intents').update({
        status: 'BOOKED',
        booking_id: bookingId,
      }).eq('id', paymentIntent.id).eq('status', 'PROCESSING')
    } else if (effectivePromoCodeId || effectiveAmount === 0) {
      await supabase.from('payment_intents').insert({
        razorpay_order_id: 'free_' + bookingId,
        user_id: userId, event_id: effectiveEventId, show_id: effectiveShowId,
        seat_ids: effectiveSeatIds, amount: effectiveAmount,
        discount_amount: effectiveDiscountAmount, promo_code_id: effectivePromoCodeId,
        lock_expires_at: new Date().toISOString(), status: 'BOOKED', booking_id: bookingId,
      })
    }
    const auditDetails = `Booking ${bookingId.slice(0, 8)} for ${effectiveSeatIds.length} seats, amount ₹${effectiveAmount}${effectivePromoCodeId ? ' (promo applied)' : ''}`
    await supabase.from('audit_logs').insert({
      user_id: userId, action: 'BOOKING_CREATED', entity_type: 'booking', entity_id: bookingId,
      details: auditDetails,
    })
    try {
      const { data: userProfile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle()
      const recipientEmail = customer_email || userProfile?.email
      if (recipientEmail) {
        const qrDataUrls = await Promise.all(tickets.map(t =>
          generateQRDataUrl(JSON.stringify({ ticket_id: t.ticket_id, token: t.verification_token.slice(0, 20) }))
        ))
        await sendEmail(recipientEmail, 'Booking Confirmed - CSM Auditorium', buildConfirmationHtml({
          eventTitle: (show as any).events?.title || 'Event',
          showDate: (show as any).show_date,
          showTime: (show as any).start_time,
          tickets: tickets.map((t, i) => ({
            ticketId: t.ticket_id,
            seatNumber: selectedSeats[i]?.seat_number || '',
            rowLabel: selectedSeats[i]?.row_label || '',
            category: selectedSeats[i]?.category || '',
            qrDataUrl: qrDataUrls[i],
          })),
          totalAmount: String(effectiveAmount),
          bookingId,
          customerName: customer_name || userProfile?.full_name || 'Customer',
          firstTicketId: tickets[0]?.ticket_id,
        }))
      }
    } catch (e) { console.error('Confirmation email failed:', e) }
    return corsResponse({ booking_id: bookingId, success: true, tickets: tickets.map(t => ({ ticket_id: t.ticket_id, token: t.verification_token })) })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
