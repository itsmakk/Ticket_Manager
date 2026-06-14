import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, events:event_id(title), shows:show_id(show_date, start_time), booking_seats(*), tickets(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return corsResponse(bookings)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
