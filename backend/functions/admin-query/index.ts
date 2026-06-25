import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'
import { flattenShowSeat } from '../_shared/show-seats.ts'
import { buildAuditoriumLayout } from '../_shared/seat-layout.ts'
import { isPastBookingCutoff } from '../_shared/booking-cutoff.ts'
import { cancelBooking } from '../_shared/cancel-booking.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { resource, action, ...params } = await req.json()
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Verify role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (!profile) throw new Error('Unauthorized')
    const isAdmin = profile.role === 'admin'
    const isCounter = profile.role === 'counter'
    const isScanner = profile.role === 'scanner'

    const scannerAllowed = isScanner && resource === 'tickets' && action === 'verify'
    const counterAllowed = isCounter && resource === 'counter' && action === 'shows'
    if (!isAdmin && !scannerAllowed && !counterAllowed) throw new Error('Unauthorized')

    const page = Math.max(1, params.page || 1)
    const limit = Math.min(Math.max(1, params.limit || 20), 1000)

    function paginatedQuery(query: any) {
      const from = (page - 1) * limit
      return query.range(from, from + limit - 1)
    }

    switch (resource) {
      // Dashboard
      case 'dashboard': {
        const { count: totalEvents } = await supabase.from('events').select('*', { head: true, count: 'exact' })
        const { count: totalShows } = await supabase.from('shows').select('*', { head: true, count: 'exact' })
        const { count: totalBookings } = await supabase.from('bookings').select('*', { head: true, count: 'exact' })
        const { data: revenueData } = await supabase.from('bookings').select('total_amount').eq('status', 'Confirmed')
        const totalRevenue = (revenueData || []).reduce((s, r) => s + parseFloat(r.total_amount || '0'), 0)
        const { data: recentBookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10)
        return corsResponse({ total_events: totalEvents, total_shows: totalShows, total_bookings: totalBookings, total_revenue: totalRevenue, recent_bookings: recentBookings })
      }

      // Events
      case 'events': {
        if (action === 'list') {
          const { count } = await supabase.from('events').select('*', { head: true, count: 'exact' })
          const { data } = await paginatedQuery(supabase.from('events').select('*').order('created_at', { ascending: false }))
          return corsResponse({ data, total: count || 0, page, limit })
        }
        if (action === 'get') { const { data } = await supabase.from('events').select('*').eq('id', params.id).single(); return corsResponse(data) }
        if (action === 'create') { const { id, ...createParams } = params; const { data } = await supabase.from('events').insert(createParams).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_CREATED', entity_type: 'event', entity_id: data?.id }); return corsResponse(data) }
        if (action === 'update') { const { id, ...updateParams } = params; const { data } = await supabase.from('events').update(updateParams).eq('id', params.id).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_UPDATED', entity_type: 'event', entity_id: params.id }); return corsResponse(data) }
        if (action === 'delete') { await supabase.from('events').delete().eq('id', params.id); await supabase.from('shows').delete().eq('event_id', params.id); await supabase.from('audit_logs').insert({ user_id: userId, action: 'EVENT_DELETED', entity_type: 'event', entity_id: params.id }); return corsResponse({ success: true }) }
        break
      }

      // Shows
      case 'shows': {
        if (action === 'list') {
          let showQuery = supabase.from('shows').select('*, events:event_id(title)', { count: 'exact' })
          if (params.event_id) showQuery = showQuery.eq('event_id', params.event_id)
          const { count, data } = await paginatedQuery(
            showQuery
              .order('show_date', { ascending: false })
              .order('start_time', { ascending: false })
          )
          return corsResponse({ data: (data || []).map(s => ({ ...s, event_title: (s as any).events?.title || '' })), total: count || 0, page, limit })
        }
        if (action === 'create') {
          const { id, ...createParams } = params
          const { data, error } = await supabase.from('shows').insert(createParams).select().single()
          if (error) throw error
          await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_CREATED', entity_type: 'show', entity_id: data.id })
          return corsResponse(data)
        }
        if (action === 'update') { const { id, ...updateParams } = params; const { data } = await supabase.from('shows').update(updateParams).eq('id', params.id).select().single(); await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_UPDATED', entity_type: 'show', entity_id: params.id }); return corsResponse(data) }
        if (action === 'delete') { await supabase.from('shows').delete().eq('id', params.id); await supabase.from('audit_logs').insert({ user_id: userId, action: 'SHOW_DELETED', entity_type: 'show', entity_id: params.id }); return corsResponse({ success: true }) }
        break
      }

      // Seats
      case 'seats': {
        if (action === 'layout') {
          const { data, error } = await supabase
            .from('auditorium_seats')
            .select('*')
            .order('row_label')
            .order('seat_number')
          if (error) throw error
          return corsResponse(data)
        }
        if (action === 'list') {
          const { data, error } = await supabase
            .from('show_seats')
            .select('id, show_id, auditorium_seat_id, status, locked_at, booking_id, auditorium_seats!inner(seat_number, row_label, category, is_active)')
            .eq('show_id', params.show_id)
          if (error) throw error
          return corsResponse((data || []).map(flattenShowSeat))
        }
        if (action === 'generate') {
          const layout = buildAuditoriumLayout(params.rows, params.seats_per_row, params.categories)

          const { data: savedCount, error: layoutError } = await supabase
            .rpc('replace_auditorium_layout', { p_layout: layout })
          if (layoutError) throw layoutError
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'AUDITORIUM_LAYOUT_REPLACED',
            entity_type: 'auditorium',
            details: `${layout.length} seats across ${new Set(layout.map(seat => seat.row_label)).size} rows`,
          })
          return corsResponse({ success: true, count: savedCount })
        }
        break
      }

      // Bookings
      case 'bookings': {
        if (action === 'list') {
          const { count } = await supabase.from('bookings').select('*', { head: true, count: 'exact' })
          const { data, error } = await paginatedQuery(supabase.from('bookings').select('*, events:event_id(title), shows:show_id(show_date, start_time)').order('created_at', { ascending: false }))
          if (error) throw error
          return corsResponse({ data, total: count || 0, page, limit })
        }
        if (action === 'cancel') { const r = await cancelBooking(supabase, userId, params.id, params.reason); return corsResponse({ success: true, refunded: r.refunded }) }
        break
      }

      // Counter
      case 'counter': {
        if (action === 'shows') {
          const { data, error } = await supabase
            .from('shows')
            .select('*, events:event_id(title)')
            .in('status', ['Upcoming', 'Active'])
            .order('show_date', { ascending: true })
            .order('start_time', { ascending: true })
          if (error) throw error
          return corsResponse((data || []).filter(s => !isPastBookingCutoff(s)))
        }
        break
      }

      // Tickets
      case 'tickets': {
        if (action === 'verify') {
          const { data: t } = await supabase.from('tickets').select('ticket_id, show_seat_id, status, bookings:booking_id(user_id, event_id, show_id, total_amount, status)').eq('ticket_id', params.ticket_id).single()
          let seat = null
          if (t?.show_seat_id) {
            const { data: s } = await supabase.from('show_seats').select('auditorium_seats!inner(seat_number, row_label, category)').eq('id', t.show_seat_id).single()
            if (s) seat = s.auditorium_seats
          }
          return corsResponse({ valid: t?.status === 'Valid', ticket: { ...t, seat } })
        }
        break
      }

      // Maintenance
      case 'maintenance': {
        if (action === 'get') { const { data } = await supabase.from('maintenance_mode').select('*').eq('id', 1).single(); return corsResponse(data) }
        if (action === 'update') { await supabase.from('maintenance_mode').update({ enabled: params.enabled, message: params.message || undefined, updated_at: new Date().toISOString() }).eq('id', 1); await supabase.from('audit_logs').insert({ user_id: userId, action: 'MAINTENANCE_MODE_' + (params.enabled ? 'ENABLED' : 'DISABLED'), entity_type: 'system', details: params.enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' }); return corsResponse({ success: true }) }
        break
      }

      // Promos
      case 'promos': {
        if (action === 'list') { const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false }); return corsResponse(data) }
        if (action === 'create') { const { id, ...createParams } = params; const { data } = await supabase.from('promo_codes').insert(createParams).select().single(); return corsResponse(data) }
        if (action === 'update') { const { id, ...updateParams } = params; const { data } = await supabase.from('promo_codes').update(updateParams).eq('id', params.id).select().single(); return corsResponse(data) }
        if (action === 'delete') { await supabase.from('promo_codes').delete().eq('id', params.id); return corsResponse({ success: true }) }
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

        return corsResponse({ total_revenue: totalRevenue, total_bookings: totalBookings, avg_booking_value: avgBooking, total_tickets: totalTickets, cancelled_bookings: cancelledBookings.length, used_promos: usedPromos, revenue_by_event: revenueByEvent })
      }

      // Users
      case 'users': {
        if (action === 'list') {
          const { count } = await supabase.from('profiles').select('*', { head: true, count: 'exact' })
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const from = (page - 1) * limit
          const { data: profiles } = await supabase.from('profiles').select('*').range(from, from + limit - 1)
          const merged = (profiles || []).map(p => {
            const au = authUsers?.users?.find(u => u.id === p.id)
            return { ...p, email: p.email || au?.email || '', last_sign_in: au?.last_sign_in_at || null, created_at: p.created_at }
          })
          return corsResponse({ data: merged, total: count || 0, page, limit })
        }
        if (action === 'update_role') {
          if (params.id === userId && params.role !== 'admin') throw new Error('Cannot demote yourself')
          const { data } = await supabase.from('profiles').update({ role: params.role }).eq('id', params.id).select().single()
          await supabase.from('audit_logs').insert({ user_id: userId, action: 'USER_ROLE_CHANGED', entity_type: 'user', entity_id: params.id, details: `role=${params.role}` })
          return corsResponse(data)
        }
        break
      }

      // Audit
      case 'audit': {
        const { count } = await supabase.from('audit_logs').select('*', { head: true, count: 'exact' })
        const auditLimit = Math.min(Math.max(1, params.limit || 50), 200)
        const from = (page - 1) * auditLimit
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).range(from, from + auditLimit - 1)
        const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))]
        const { data: profiles } = userIds.length ? await supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] }
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]))
        const enriched = (data || []).map(log => ({
          ...log, user_name: profileMap[log.user_id] || log.user_id?.slice(0,8) || '-'
        }))
        return corsResponse({ data: enriched, total: count || 0, page, limit: auditLimit })
      }

      default:
        throw new Error(`Unknown resource: ${resource}`)
    }

    return corsResponse({ error: 'Invalid action' }, 400)
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
