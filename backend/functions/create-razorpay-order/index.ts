import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { show_id, seats, promo_code } = await req.json()
    if (!show_id || !seats?.length) throw new Error('show_id and seats are required')

    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Get show prices
    const { data: show, error: se } = await supabase.from('shows').select('*').eq('id', show_id).single()
    if (se || !show) throw new Error('Show not found')

    // Calculate amount
    let amount = 0
    for (const seat of seats) {
      const price = show[`price_${seat.category}`]
      if (!price) throw new Error(`Invalid category: ${seat.category}`)
      amount += Number(price)
    }

    // Promo code validation
    let discountAmount = 0
    let promoCodeId = null
    if (promo_code) {
      const { data: promo, error: pe } = await supabase.from('promo_codes').select('*').eq('code', promo_code.toUpperCase()).eq('is_active', true).single()
      if (pe) throw new Error('Invalid promo code')
      if (promo.max_uses && promo.used_count >= promo.max_uses) throw new Error('Promo code usage limit reached')
      if (amount < (promo.min_order_amount || 0)) throw new Error(`Minimum order amount ₹${promo.min_order_amount} required`)
      if (promo.discount_type === 'percentage') {
        discountAmount = Math.round((amount * promo.discount_value) / 100)
        if (promo.max_discount_amount) discountAmount = Math.min(discountAmount, promo.max_discount_amount)
      } else {
        discountAmount = promo.discount_value
      }
      promoCodeId = promo.id
    }

    const finalAmount = Math.max(0, amount - discountAmount)

    // If free, no need for Razorpay order
    if (finalAmount === 0) {
      return new Response(JSON.stringify({ amount: 0, is_free: true, discount_amount: discountAmount, promo_code_id: promoCodeId }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Create Razorpay order
    const rzpKey = Deno.env.get('RAZORPAY_KEY_ID')!
    const rzpSecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + btoa(rzpKey + ':' + rzpSecret) },
      body: JSON.stringify({ amount: finalAmount * 100, currency: 'INR', receipt: `txn_${Date.now()}` }),
    })
    const rzpOrder = await rzpRes.json()
    if (!rzpRes.ok) throw new Error(rzpOrder.error?.description || 'Razorpay error')

    return new Response(JSON.stringify({
      razorpay_order_id: rzpOrder.id,
      amount: finalAmount,
      currency: 'INR',
      discount_amount: discountAmount,
      promo_code_id: promoCodeId,
      is_free: false,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
