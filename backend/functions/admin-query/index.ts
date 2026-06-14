import { getSupabase, getUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const userId = getUser(req)
    const { resource, action, ...params } = await req.json()
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Verify role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile) throw new Error('Unauthorized')
    const isAdmin = profile.role === 'admin'
    const isScanner = profile.role === 'scanner'
    const isStaff = isAdmin || isScanner

    if (!isAdmin && resource !== 'tickets') throw new Error('Unauthorized: admin only')

    switch (resource) {
      // Dashboard
      case 'dashboard': {
        const { count: totalEvents } = await supabase.from('events').select('*', { head: true, count: 'exact' })
        const { count: totalShows } = await supabase.from('shows').select('*', { head: true, count: 'exact' })
        const { count: totalBookings } = await supabase.from('bookings').select('*', { head: true, count: 'exact' })
        const { data: revenueData } = await supabase.from('bookings').select('total_amount').eq('status', 'Confirmed')
        const totalRevenue = (revenueData || []).reduce((s, r) => s + parseFloat(r.total_amount || '0'), 0)
        const { data: recentBookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10)
        return new Response(JSON.stringify({ total_events: totalEvents, total_shows: totalShows, total_bookings: totalBookings, total_revenue: totalRevenue, recent_bookings: recentBookings }), { headers: { 'Content-Type': 'application/json' } })
      }

      // Events
      case 'events': {
        if (action === 'list') { const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'get') { const { data } = await supabase.from('events').select('*').eq('id', params.id).single(); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'create') { const { data } = await supabase.from('events').insert(params).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_CREATED', entity_type: 'event', entity_id: data?.id }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'update') { const { data } = await supabase.from('events').update(params).eq('id', params.id).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_UPDATED', entity_type: 'event', entity_id: params.id }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'delete') { await supabase.from('events').delete().eq('id', params.id); await supabase.from('shows').delete().eq('event_id', params.id); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_DELETED', entity_type: 'event', entity_id: params.id }); return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }) }
        break
      }

      // Shows
      case 'shows': {
        if (action === 'create') { const { data } = await supabase.from('shows').insert(params).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_CREATED', entity_type: 'show', entity_id: data?.id }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'update') { const { data } = await supabase.from('shows').update(params).eq('id', params.id).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_UPDATED', entity_type: 'show', entity_id: params.id }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'delete') { await supabase.from('shows').delete().eq('id', params.id); await supabase.from('seats').delete().eq('show_id', params.id); await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_DELETED', entity_type: 'show', entity_id: params.id }); return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }) }
        break
      }

      // Seats
      case 'seats': {
        if (action === 'list') { const { data } = await supabase.from('seats').select('*').eq('show_id', params.show_id).order('seat_number'); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'generate') {
          const { data: show } = await supabase.from('shows').select('*').eq('id', params.show_id).single()
          if (!show) throw new Error('Show not found')
          const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
          const seatsPerRow = 20
          const seats = []
          for (const row of rows) {
            for (let i = 1; i <= seatsPerRow; i++) {
              const num = `${row}${String(i).padStart(2, '0')}`
              let category = 'silver'
              if (row <= 'D') category = 'premium'
              else if (row <= 'G') category = 'gold'
              seats.push({ show_id: params.show_id, seat_number: num, category, row_label: row, status: 'available' })
            }
          }
          await supabase.from('seats').delete().eq('show_id', params.show_id)
          const { error } = await supabase.from('seats').insert(seats)
          if (error) throw error
          return new Response(JSON.stringify({ success: true, count: seats.length }), { headers: { 'Content-Type': 'application/json' } })
        }
        break
      }

      // Bookings
      case 'bookings': {
        if (action === 'list') { const { data } = await supabase.from('bookings').select('*, events:event_id(title), shows:show_id(show_date, start_time), booking_seats(*)').order('created_at', { ascending: false }).limit(100); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'cancel') { await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', params.id); await supabase.from('seats').update({ status: 'available', booking_id: null }).eq('booking_id', params.id); await supabase.from('tickets').update({ status: 'Cancelled' }).eq('booking_id', params.id); return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }) }
        break
      }

      // Tickets
      case 'tickets': {
        if (action === 'verify') { const { data } = await supabase.from('tickets').select('*, bookings:booking_id(*)').eq('ticket_id', params.ticket_id).single(); return new Response(JSON.stringify({ valid: data?.status === 'Valid', ticket: data }), { headers: { 'Content-Type': 'application/json' } }) }
        break
      }

      // Promos
      case 'promos': {
        if (action === 'list') { const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false }); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'create') { const { data } = await supabase.from('promo_codes').insert(params).select().single(); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'update') { const { data } = await supabase.from('promo_codes').update(params).eq('id', params.id).select().single(); return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }) }
        if (action === 'delete') { await supabase.from('promo_codes').delete().eq('id', params.id); return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }) }
        break
      }

      // Reports
      case 'reports': {
        const { data: bookings } = await supabase.from('bookings').select('*')
        const totalBookings = (bookings || []).length
        const confirmedBookings = (bookings || []).filter(b => b.status === 'Confirmed')
        const cancelledBookings = (bookings || []).filter(b => b.status === 'Cancelled')
        const totalRevenue = confirmedBookings.reduce((s, b) => s + parseFloat(b.total_amount || '0'), 0)
        const avgBooking = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0
        const { count: totalTickets } = await supabase.from('tickets').select('*', { head: true, count: 'exact' })
        const { count: usedPromos } = await supabase.from('bookings').select('*', { head: true, count: 'exact' }).not('promo_code_id', 'is', null)

        // Revenue by event
        const { data: events } = await supabase.from('events').select('id, title')
        const revenueByEvent = []
        for (const ev of events || []) {
          const { data: evBookings } = await supabase.from('bookings').select('total_amount').eq('event_id', ev.id).eq('status', 'Confirmed')
          const rev = (evBookings || []).reduce((s, b) => s + parseFloat(b.total_amount || '0'), 0)
          revenueByEvent.push({ title: ev.title, revenue: rev, count: evBookings?.length || 0 })
        }

        return new Response(JSON.stringify({ total_revenue: totalRevenue, total_bookings: totalBookings, avg_booking_value: avgBooking, total_tickets: totalTickets, cancelled_bookings: cancelledBookings.length, used_promos: usedPromos, revenue_by_event: revenueByEvent }), { headers: { 'Content-Type': 'application/json' } })
      }

      // Audit
      case 'audit': {
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
      }

      default:
        throw new Error(`Unknown resource: ${resource}`)
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
