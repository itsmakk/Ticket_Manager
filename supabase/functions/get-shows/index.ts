import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { event_id } = await req.json()
    if (!event_id) throw new Error('event_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const { data: shows, error } = await supabase
      .from('shows')
      .select('id, event_id, show_date, start_time, duration, end_time, status, price_premium, price_gold, price_silver, booking_cutoff_minutes, events!inner(status)')
      .eq('event_id', event_id)
      .eq('events.status', 'Published')
      .in('status', ['Upcoming', 'Active'])
      .order('show_date', { ascending: true })
      .order('start_time', { ascending: true })
    if (error) throw error
    const available = (shows || []).filter(s => !isPastBookingCutoff(s))
    return corsResponse(available.map(({ events: _events, ...show }) => show))
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
