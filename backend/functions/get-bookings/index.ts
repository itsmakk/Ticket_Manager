import { getSupabase, getUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const userId = getUser(req)
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, events:event_id(title), shows:show_id(show_date, start_time), booking_seats(*), tickets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return new Response(JSON.stringify(bookings), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
