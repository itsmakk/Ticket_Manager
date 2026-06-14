import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { booking_id } = await req.json()
    if (!booking_id) throw new Error('booking_id required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', booking_id)
    if (error) throw error
    await supabase.from('seats').update({ status: 'available', booking_id: null }).eq('booking_id', booking_id)
    await supabase.from('tickets').update({ status: 'Cancelled' }).eq('booking_id', booking_id)
    return corsResponse({ success: true })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
