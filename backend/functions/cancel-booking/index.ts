import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) throw new Error('booking_id required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', booking_id)
    if (error) throw error
    await supabase.from('seats').update({ status: 'available', booking_id: null }).eq('booking_id', booking_id)
    await supabase.from('tickets').update({ status: 'Cancelled' }).eq('booking_id', booking_id)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
