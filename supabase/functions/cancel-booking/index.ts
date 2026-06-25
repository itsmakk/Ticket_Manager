import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { cancelBooking } from '../_shared/cancel-booking.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { booking_id, reason } = await req.json()
    if (!booking_id) throw new Error('booking_id required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile || profile.role !== 'admin') throw new Error('Unauthorized: admin only')
    const result = await cancelBooking(supabase, userId, booking_id, reason)
    return corsResponse({ success: true, refunded: result.refunded, refund_id: result.refundId })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
