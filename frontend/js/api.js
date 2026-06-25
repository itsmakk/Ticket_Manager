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
    const token = session?.access_token || CONFIG.SUPABASE_ANON_KEY
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

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

  window.renderPagination = function(containerId, page, total, limit, onClick) {
    const el = document.getElementById(containerId)
    if (!el) return
    const totalPages = Math.ceil(total / limit)
    if (totalPages <= 1) { el.innerHTML = ''; return }
    let html = ''
    if (page > 1) html += `<button class="pagination-btn" data-p="${page - 1}">« Prev</button>`
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    if (start > 1) html += `<button class="pagination-btn" data-p="1">1</button>${start > 2 ? '<span class="pagination-info">...</span>' : ''}`
    for (let i = start; i <= end; i++) html += `<button class="pagination-btn${i === page ? ' active' : ''}" data-p="${i}">${i}</button>`
    if (end < totalPages) html += `${end < totalPages - 1 ? '<span class="pagination-info">...</span>' : ''}<button class="pagination-btn" data-p="${totalPages}">${totalPages}</button>`
    if (page < totalPages) html += `<button class="pagination-btn" data-p="${page + 1}">Next »</button>`
    el.innerHTML = html
    el.querySelectorAll('.pagination-btn[data-p]').forEach(btn => btn.addEventListener('click', () => onClick(parseInt(btn.dataset.p))))
  }
})()
