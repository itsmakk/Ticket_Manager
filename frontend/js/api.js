// ============================================================
// API Layer — Frontend ONLY talks to Edge Functions
// NO direct Supabase database queries from the browser
// ============================================================

;(function() {
  const supabaseInstance = window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  window.__apiSupabase = supabaseInstance

  function getSB() { return supabaseInstance }
  window.getSB = getSB

  async function call(name, payload) {
    const sb = getSB()
    if (!sb) throw new Error('Supabase client not initialized')
    const { data: { session } } = await sb.auth.getSession()
    const headers = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${CONFIG.FUNCTIONS_URL}/${name}`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `API ${name} failed`)
    return data
  }

  window.API = {
    // Public reads
    getEvents() { return call('get-events', {}) },
    getShows(eventId) { return call('get-shows', { event_id: eventId }) },
    getSeatMap(showId) { return call('get-seat-map', { show_id: showId }) },
    getBookings() { return call('get-bookings', {}) },
    getTicket(ticketId) { return call('get-ticket', { ticket_id: ticketId }) },
    getProfile() { return call('get-profile', {}) },
    updateProfile(data) { return call('update-profile', data) },

    // Booking / payment
    lockSeats(showId, seatIds) { return call('lock-seats', { show_id: showId, seat_ids: seatIds }) },
    createOrder(showId, seats, promoCode, eventId, quoteOnly = false) {
      return call('create-razorpay-order', {
        show_id: showId,
        event_id: eventId,
        seats: seats.map(s => ({ seat_id: s.seat_id, category: s.category })),
        promo_code: promoCode || undefined,
        quote_only: quoteOnly,
      })
    },
    verifyPayment(payload) { return call('verify-payment', payload) },
    releaseSeats(showId, seatIds) { return call('release-seats', { show_id: showId, seat_ids: seatIds }) },

    // Admin
    admin(resource, action, data = {}) { return call('admin-query', { resource, action, ...data }) },
    adminDashboard() { return this.admin('dashboard', 'stats') },
    adminEvents(action, data) { return this.admin('events', action, data) },
    adminShows(action, data) { return this.admin('shows', action, data) },
    adminSeats(action, data) { return this.admin('seats', action, data) },
    adminBookings(action, data) { return this.admin('bookings', action, data) },
    counterShows() { return this.admin('counter', 'shows') },
    adminTickets(action, data) { return this.admin('tickets', action, data) },
    verifyTicket(ticketId) { return this.adminTickets('verify', { ticket_id: ticketId }) },
    adminPromos(action, data) { return this.admin('promos', action, data) },
    adminReports() { return this.admin('reports', 'all') },
    adminAudit() { return this.admin('audit', 'list') },
    adminUsers(action, data) { return this.admin('users', action, data) },
  }
})()
