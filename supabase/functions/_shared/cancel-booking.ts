import { getSupabase } from './supabase.ts'
import { sendEmail, buildCancellationHtml } from './email.ts'

export async function cancelBooking(supabase: ReturnType<typeof getSupabase>, userId: string, bookingId: string, reason?: string): Promise<{ refunded: boolean; refundId?: string }> {
  const { data: booking, error: be } = await supabase
    .from('bookings')
    .select('id, status, payment_id, razorpay_order_id, payment_mode, total_amount, user_id, event_id, show_id')
    .eq('id', bookingId)
    .single()
  if (be || !booking) throw new Error('Booking not found')
  if (booking.status === 'Cancelled') throw new Error('Booking is already cancelled')

  const { error: ue } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', bookingId)
  if (ue) throw ue

  const { error: sse } = await supabase.from('show_seats').update({ status: 'available', booking_id: null }).eq('booking_id', bookingId)
  if (sse) throw sse

  const { error: te } = await supabase.from('tickets').update({ status: 'Cancelled' }).eq('booking_id', bookingId)
  if (te) throw te

  let refunded = false
  let refundId: string | undefined
  if (booking.payment_id && booking.razorpay_order_id && booking.payment_mode === 'ONLINE') {
    try {
      const keyId = Deno.env.get('RAZORPAY_KEY_ID')!
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(booking.payment_id)}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(keyId + ':' + keySecret),
        },
        body: JSON.stringify({ notes: { reason: 'booking_cancellation' } }),
      })
      const refund = await response.json()
      if (response.ok) {
        refunded = true
        refundId = refund.id
      }
    } catch {
      // refund failure is non-fatal; audit will note it
    }
    await supabase.from('payment_intents').update({
      status: refunded ? 'REFUNDED' : 'RECONCILIATION_REQUIRED',
      refund_id: refundId || null,
      failure_reason: refunded ? null : 'Automatic refund failed during cancellation',
    }).eq('razorpay_order_id', booking.razorpay_order_id)
  }

  const details = `Booking ${bookingId.slice(0, 8)} cancelled by admin. Amount: ₹${booking.total_amount}${refunded ? `. Refund: ${refundId}` : ''}${reason ? `. Reason: ${reason}` : ''}`
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'BOOKING_CANCELLED',
    entity_type: 'booking',
    entity_id: bookingId,
    details,
  })

  try {
    const { data: evt } = await supabase.from('events').select('title').eq('id', booking.event_id).maybeSingle()
    const { data: shw } = await supabase.from('shows').select('show_date, start_time').eq('id', booking.show_id).maybeSingle()
    const { data: userProfile } = await supabase.from('profiles').select('email').eq('id', booking.user_id).maybeSingle()
    if (userProfile?.email) {
      await sendEmail(userProfile.email, 'Booking Cancelled - CSM Auditorium', buildCancellationHtml({
        eventTitle: evt?.title || 'Event',
        showDate: shw?.show_date || '',
        showTime: shw?.start_time || '',
        bookingId,
        refunded,
        refundId,
        reason,
      }))
    }
  } catch (e) { console.error('Cancellation email failed:', e) }

  return { refunded, refundId }
}
