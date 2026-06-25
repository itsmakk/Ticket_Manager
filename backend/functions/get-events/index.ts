import { getSupabase, corsResponse, handleCors } from '../_shared/supabase.ts'
import { assertNotMaintenance } from '../_shared/maintenance.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await assertNotMaintenance(supabase)
    const today = new Date().toISOString().split('T')[0]

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, category, poster_url, banner_url, trailer_url, status')
      .eq('status', 'Published')
      .order('created_at', { ascending: false })
    if (eventsError) throw eventsError

    if (!events?.length) return corsResponse([])

    const eventIds = events.map((e: any) => e.id)
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, event_id, show_date, start_time, status')
      .in('event_id', eventIds)
      .in('status', ['Upcoming', 'Active'])
      .gte('show_date', today)
      .order('show_date', { ascending: true })
      .order('start_time', { ascending: true })
    if (showsError) throw showsError

    const nextShowByEvent: Record<string, any> = {}
    for (const show of shows || []) {
      if (!nextShowByEvent[show.event_id]) {
        nextShowByEvent[show.event_id] = show
      }
    }

    const result = events.map((e: any) => ({
      ...e,
      next_show: nextShowByEvent[e.id] || null,
    }))

    return corsResponse(result)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
