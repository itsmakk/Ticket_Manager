import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { assertOwnedSeatLocks, assertResourceCount } from '../_shared/resource-authorization.ts'
import { flattenShowSeat } from '../_shared/show-seats.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { show_id, seats, promo_code, quote_only } = await req.json()
    if (!show_id || !seats?.length) throw new Error('show_id and seats are required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const { data: show, error: se } = await supabase
      .from('shows')
      .select('*, events!inner(status)')
      .eq('id', show_id)
      .eq('events.status', 'Published')
      .in('status', ['Upcoming', 'Active'])
      .single()
    if (se || !show) throw new Error('Show not found')
    if (isPastBookingCutoff(show)) throw new Error('Booking cutoff has passed for this show')
    const seatIds = seats.map(seat => seat.seat_id)
    const { data: selectedSeatRecords, error: seatError } = await supabase
      .from('show_seats')
      .select('id, status, auditorium_seats!inner(seat_number, row_label, category, is_active)')
      .eq('show_id', show_id)
      .in('id', seatIds)
      .eq('auditorium_seats.is_active', true)
    if (seatError) throw seatError
    const selectedSeats = (selectedSeatRecords || []).map(flattenShowSeat)
    assertResourceCount(seatIds, selectedSeats.map(seat => seat.id), 'seat')
    let lockExpiresAt: string | null = null
    if (!quote_only) {
      if (selectedSeats.some(seat => seat.status !== 'locked')) {
        throw new Error('All selected seats must be locked before creating an order')
      }
      const { data: locks, error: lockError } = await supabase
        .from('seat_locks')
        .select('seat_id, user_id, expires_at')
        .eq('show_id', show_id)
        .in('seat_id', seatIds)
      if (lockError) throw lockError
      assertOwnedSeatLocks(seatIds, locks || [], userId)
      lockExpiresAt = (locks || []).reduce(
        (earliest, lock) => !earliest || lock.expires_at < earliest ? lock.expires_at : earliest,
        null as string | null,
      )
      if (!lockExpiresAt) throw new Error('Seat lock expiry could not be determined')
    }
    let amount = 0
    const validCategories = ['premium', 'gold', 'silver']
    for (const seat of selectedSeats) {
      if (!validCategories.includes(seat.category)) throw new Error(`Invalid seat category: ${seat.category}`)
      const price = show[`price_${seat.category}`]
      if (price === undefined || price === null || isNaN(Number(price))) throw new Error(`Missing price configuration for category: ${seat.category}`)
      amount += Number(price)
    }
    let discountAmount = 0
    let promoCodeId = null
    if (promo_code) {
      const { data: promo, error: pe } = await supabase.from('promo_codes').select('*').eq('code', promo_code.toUpperCase()).eq('is_active', true).single()
      if (pe) throw new Error('Invalid promo code')
      if (promo.max_uses && promo.used_count >= promo.max_uses) throw new Error('Promo code usage limit reached')
      if (amount < (promo.min_order_amount || 0)) throw new Error(`Minimum order amount ₹${promo.min_order_amount} required`)
      if (promo.discount_type === 'PERCENTAGE') {
        discountAmount = Math.round((amount * promo.discount_value) / 100)
        if (promo.max_discount_amount) discountAmount = Math.min(discountAmount, promo.max_discount_amount)
      } else if (promo.discount_type === 'COMPLIMENTARY') {
        discountAmount = amount
      } else {
        discountAmount = promo.discount_value
      }
      promoCodeId = promo.id
    }
    const finalAmount = Math.max(0, amount - discountAmount)
    if (quote_only) {
      return corsResponse({
        amount: finalAmount,
        is_free: finalAmount === 0,
        discount_amount: discountAmount,
        promo_code_id: promoCodeId,
        quote_only: true,
      })
    }
    if (finalAmount === 0) {
      return corsResponse({ amount: 0, is_free: true, discount_amount: discountAmount, promo_code_id: promoCodeId })
    }
    const rzpKey = Deno.env.get('RAZORPAY_KEY_ID')!
    const rzpSecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + btoa(rzpKey + ':' + rzpSecret) },
      body: JSON.stringify({ amount: finalAmount * 100, currency: 'INR', receipt: `txn_${Date.now()}` }),
    })
    const rzpOrder = await rzpRes.json()
    if (!rzpRes.ok) throw new Error(rzpOrder.error?.description || 'Razorpay error')
    const { error: intentError } = await supabase.from('payment_intents').insert({
      razorpay_order_id: rzpOrder.id,
      user_id: userId,
      event_id: show.event_id,
      show_id,
      seat_ids: seatIds,
      amount: finalAmount,
      discount_amount: discountAmount,
      promo_code_id: promoCodeId,
      lock_expires_at: lockExpiresAt,
      status: 'PENDING',
    })
    if (intentError) throw intentError
    return corsResponse({
      razorpay_order_id: rzpOrder.id, amount: finalAmount, currency: 'INR',
      discount_amount: discountAmount, promo_code_id: promoCodeId, is_free: false,
    })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
