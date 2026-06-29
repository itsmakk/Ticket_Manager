// Booking flow — ALL data through API (Edge Functions)
let selectedShow = null, selectedSeats = [], selectedSeatData = [], lockInterval = null
let promoDiscount = 0, promoCodeId = null, razorpayOrder = null, cachedShowPricing = null
const eventId = new URLSearchParams(location.search).get('id')

// Small helpers (fall back gracefully if ui.js absent)
function notify(msg, type) { if (window.UI) UI.toast(msg, type); else if (type === 'error') alert(msg) }
const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)

async function loadEvent() {
  const detail = document.getElementById('eventDetail')
  if (!eventId) { detail.innerHTML = '<div class="alert alert-danger" role="alert">No event specified.</div>'; return }
  detail.innerHTML = '<div class="spinner" aria-label="Loading event"></div>'
  try {
    const events = await API.getEvents()
    const event = events.find(e => e.id === eventId)
    if (!event) { detail.innerHTML = '<div class="alert alert-danger" role="alert">Event not found.</div>'; return }
    function getYoutubeEmbedUrl(url) {
      if (!url) return null
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      return match ? `https://www.youtube.com/embed/${match[1]}` : null
    }
    const hasTrailer = event.trailer_url && getYoutubeEmbedUrl(event.trailer_url)
    const posterHtml = event.poster_url
      ? `<img src="${esc(event.poster_url)}" alt="${esc(event.title)} poster" />`
      : '<div class="event-poster-placeholder">No poster</div>'
    detail.innerHTML = `
      <div class="event-detail">
        <div class="event-poster-wrap">${posterHtml}</div>
        <div class="event-info">
          <div class="event-meta"><span class="badge badge-primary">${esc(event.category || 'Event')}</span></div>
          <h1>${esc(event.title)}</h1>
          <div class="event-description">${esc(event.description || '')}</div>
          <div class="event-actions">
            ${hasTrailer ? `<button class="btn btn-outline" data-trailer-url="${esc(event.trailer_url)}">▶ Trailer</button>` : ''}
          </div>
        </div>
      </div>`
    loadShows()
  } catch (err) { detail.innerHTML = `<div class="alert alert-danger" role="alert">${esc(err.message)}</div>` }
}

async function loadShows() {
  const container = document.getElementById('showSelector'); const grid = document.getElementById('showsGrid')
  if (grid) grid.innerHTML = '<div class="spinner" aria-label="Loading shows"></div>'
  try {
    const shows = await API.getShows(eventId)
    if (!shows?.length) { container.style.display = 'none'; return }
    container.style.display = 'block'
    grid.innerHTML = shows.map(s => `<div class="card show-card${selectedShow===s.id?' selected':''}" data-show-id="${esc(s.id)}" role="button" tabindex="0" aria-pressed="${selectedShow===s.id}">
      <div class="event-card-body">
        <h4>${esc(formatShowDate(s.show_date))}</h4>
        <p class="show-time">${esc(formatShowTime(s.start_time))}</p>
        <p class="show-pricing">Premium ₹${esc(s.price_premium)} &middot; Gold ₹${esc(s.price_gold)} &middot; Silver ₹${esc(s.price_silver)}</p>
        <span class="badge badge-${s.status==='Active'?'success':'primary'}">${esc(s.status)}</span>
      </div>
    </div>`).join('')
    grid.className = 'shows-grid'
    grid.querySelectorAll('.show-card').forEach(el => {
      el.addEventListener('click', () => selectShow(el.dataset.showId))
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectShow(el.dataset.showId) } })
    })
  } catch (err) { if (grid) grid.innerHTML = `<div class="alert alert-danger" role="alert">${esc(err.message)}</div>` }
}

// Lightweight date/time formatting for show cards
function formatShowDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }
  catch { return d }
}
function formatShowTime(t) {
  if (!t) return ''
  const [h, m] = String(t).split(':').map(Number)
  if (isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${ampm}`
}

async function selectShow(id) {
  selectedShow = id; selectedSeats = []; selectedSeatData = []; promoDiscount = 0; promoCodeId = null; razorpayOrder = null; cachedShowPricing = null
  document.getElementById('promoInput').value = ''; document.getElementById('promoMessage').textContent = ''
  document.getElementById('paymentSection').style.display = 'none'; document.getElementById('proceedBtn').style.display = 'block'; document.getElementById('proceedBtn').disabled = true
  if (lockInterval) { clearInterval(lockInterval); lockInterval = null }
  loadShows(); loadSeatMap()
}

async function loadSeatMap() {
  const container = document.getElementById('seatSelection')
  if (!selectedShow) { container.style.display = 'none'; return }
  container.style.display = 'block'
  const seatMapEl = document.getElementById('seatMap')
  seatMapEl.innerHTML = '<div class="spinner" aria-label="Loading seats"></div>'
  try {
    const { show, seats } = await API.getSeatMap(selectedShow)
    if (!show || !seats) { seatMapEl.innerHTML = '<p class="text-muted">No seating layout.</p>'; return }
    cachedShowPricing = { price_premium: show.price_premium, price_gold: show.price_gold, price_silver: show.price_silver }
    const html = Object.entries(seats).map(([row, rowSeats]) => `
      <div class="seat-row"><span class="seat-row-label">${esc(row)}</span>
        ${rowSeats.map(s => {
          const sel = selectedSeats.includes(s.id)
          const selectable = s.status === 'available' || sel
          const attrs = selectable
            ? `data-seat-id="${esc(s.id)}" data-seat-num="${esc(s.seat_number)}" data-seat-cat="${esc(s.category)}" role="button" tabindex="0" aria-pressed="${sel}" aria-label="Seat ${esc(s.seat_number)}, ${esc(s.category)}"`
            : `aria-disabled="true" aria-label="Seat ${esc(s.seat_number)}, ${esc(s.status)}"`
          return `<div class="seat ${sel ? 'selected' : esc(s.status)} category-${esc(s.category)}" ${attrs} title="${esc(s.seat_number)} (${esc(s.category)})">${esc(String(s.seat_number).replace(row, ''))}</div>`
        }).join('')}
        <span class="seat-row-label">${esc(row)}</span>
      </div>`).join('')
    seatMapEl.innerHTML = `<div class="seat-map-scroll"><div class="screen-curve"></div><div class="screen-indicator">SCREEN — ALL EYES THIS WAY</div><div class="seat-layout">${html}</div></div>
      <div class="seat-legend">
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-premium"></span> Premium</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-gold"></span> Gold</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-silver"></span> Silver</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-selected"></span> Selected</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-booked"></span> Booked</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-locked"></span> Locked</span>
        <span class="seat-legend-item"><span class="seat-legend-swatch sw-blocked"></span> Blocked</span>
      </div>`
    seatMapEl.querySelectorAll('.seat[data-seat-id]').forEach(el => {
      const act = () => toggleSeat(el.dataset.seatId, el.dataset.seatNum, el.dataset.seatCat, el)
      el.addEventListener('click', act)
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } })
    })
    updateSummary()
  } catch (err) { seatMapEl.innerHTML = `<div class="alert alert-danger" role="alert">${esc(err.message)}</div>` }
}

// Toggle without re-fetching the whole seat map (DOM-only update)
function toggleSeat(id, num, cat, el) {
  const idx = selectedSeats.indexOf(id)
  if (idx > -1) {
    selectedSeats.splice(idx, 1); selectedSeatData.splice(idx, 1)
    if (el) { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false') }
  } else {
    selectedSeats.push(id); selectedSeatData.push({ seat_id: id, seat_number: num, category: cat })
    if (el) { el.classList.add('selected'); el.setAttribute('aria-pressed', 'true') }
  }
  updateSummary()
}

async function updateSummary() {
  const s = document.getElementById('summaryContent'); const pb = document.getElementById('proceedBtn')
  if (!selectedSeats.length) { s.innerHTML = '<p class="text-muted">Select one or more seats to continue.</p>'; pb.disabled = true; return }
  try {
    if (!cachedShowPricing) {
      const { show } = await API.getSeatMap(selectedShow)
      if (!show) throw new Error('Show data not available')
      cachedShowPricing = { price_premium: show.price_premium, price_gold: show.price_gold, price_silver: show.price_silver }
    }
    const show = cachedShowPricing
    let sub = 0
    const rows = selectedSeatData.map(x => {
      const price = parseFloat(show['price_' + x.category]); const p = isNaN(price) ? 0 : price; sub += p
      return `<div class="summary-seat-row"><span>${esc(x.seat_number)} <span class="text-muted">(${esc(x.category)})</span></span><span>₹${p}</span></div>`
    }).join('')
    const total = Math.max(0, sub - promoDiscount)
    s.innerHTML = `<div class="summary-seats">${rows}</div>
      <div class="summary-line"><span>Subtotal</span><span>₹${sub}</span></div>
      ${promoDiscount > 0 ? `<div class="summary-line summary-discount"><span>Discount</span><span>-₹${promoDiscount}</span></div>` : ''}
      <div class="summary-total"><span>Total</span><span>₹${total}</span></div>`
    pb.disabled = false
  } catch (err) { s.innerHTML = `<div class="alert alert-danger" role="alert">${esc(err.message)}</div>` }
}

async function applyPromo() {
  const code = document.getElementById('promoInput').value.trim().toUpperCase()
  const msg = document.getElementById('promoMessage')
  const btn = document.getElementById('applyPromoBtn')
  if (!code) { msg.textContent = ''; return }
  if (!selectedSeats.length) { msg.innerHTML = '<span class="promo-error">Select seats before applying a code.</span>'; return }
  if (window.UI) UI.setBtnLoading(btn, true)
  try {
    const order = await API.createOrder(selectedShow, selectedSeatData, code, eventId, true)
    promoDiscount = order.discount_amount || 0; promoCodeId = order.promo_code_id || null
    if (promoDiscount > 0) { msg.innerHTML = `<span class="promo-success">Code applied — you save ₹${promoDiscount}</span>`; notify(`Promo applied: -₹${promoDiscount}`, 'success') }
    else { msg.innerHTML = '<span class="promo-error">Invalid or inapplicable code.</span>' }
    updateSummary()
  } catch (err) { msg.innerHTML = `<span class="promo-error">${esc(err.message)}</span>`; promoDiscount = 0; promoCodeId = null; updateSummary() }
  finally { if (window.UI) UI.setBtnLoading(btn, false) }
}

async function proceedToPayment() {
  const sb = getSB(); const { data: { session } } = await sb.auth.getSession()
  if (!session) { location.href = `/login.html?redirect=/event-detail.html?id=${eventId}`; return }
  if (!selectedSeats.length) { notify('Please select at least one seat.', 'warning'); return }
  const btn = document.getElementById('proceedBtn')
  if (window.UI) UI.setBtnLoading(btn, true, 'Processing…'); else { btn.disabled = true; btn.textContent = 'Processing...' }
  try {
    await API.lockSeats(selectedShow, selectedSeats)
    razorpayOrder = await API.createOrder(selectedShow, selectedSeatData, document.getElementById('promoInput').value.trim().toUpperCase() || undefined, eventId)
    if (razorpayOrder.is_free) { await completeFree(session); return }
    document.getElementById('proceedBtn').style.display = 'none'; document.getElementById('paymentSection').style.display = 'block'
    startLockTimer(300)
  } catch (err) {
    notify(err.message || 'Could not start payment. Please try again.', 'error')
    await releaseSeats()
  } finally {
    if (window.UI) UI.setBtnLoading(btn, false); else { btn.disabled = false; btn.textContent = 'Proceed to Payment' }
  }
}

async function completeFree(session) {
  const r = await API.verifyPayment({ razorpay_order_id:'free', razorpay_payment_id:'free', razorpay_signature:'free', show_id:selectedShow, event_id:eventId, seats:selectedSeatData, total_amount:0, discount_amount:promoDiscount, promo_code_id:promoCodeId, user_id:session.user.id, booking_source:'USER' })
  if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]
  showSuccess(r.booking_id, 0, (r.tickets||[]).map(t => t.ticket_id))
}

function initiatePayment() {
  if (typeof Razorpay === 'undefined') {
    notify('Payment gateway not loaded. Please refresh and check your connection.', 'error')
    return
  }
  if (!razorpayOrder?.razorpay_order_id) return
  const sb = getSB()
  new Razorpay({
    key: CONFIG.RAZORPAY_KEY_ID, amount: razorpayOrder.amount*100, currency: razorpayOrder.currency||'INR',
    name: 'CSM Auditorium', order_id: razorpayOrder.razorpay_order_id,
    handler: async function(res) {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) return
      const btn = document.getElementById('payBtn')
      if (window.UI) UI.setBtnLoading(btn, true, 'Verifying…'); else { btn.disabled = true; btn.textContent = 'Verifying...' }
      try {
        const r = await API.verifyPayment({ razorpay_order_id:res.razorpay_order_id, razorpay_payment_id:res.razorpay_payment_id, razorpay_signature:res.razorpay_signature, show_id:selectedShow, event_id:eventId, seats:selectedSeatData, total_amount:razorpayOrder.amount, discount_amount:promoDiscount, promo_code_id:promoCodeId, user_id:session.user.id, booking_source:'USER' })
        if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]; showSuccess(r.booking_id, razorpayOrder.amount, (r.tickets||[]).map(t => t.ticket_id))
      } catch (err) {
        notify('Payment verification failed: ' + (err.message || 'unknown error'), 'error')
        if (window.UI) UI.setBtnLoading(btn, false); else { btn.disabled = false; btn.textContent = 'Pay Now' }
        await releaseSeats()
      }
    },
    modal: { ondismiss: async () => { await releaseSeats(); document.getElementById('paymentSection').style.display='none'; document.getElementById('proceedBtn').style.display='block' } },
    theme: { color: '#E2C854' },
    timeout: 300,
  }).open()
}

function startLockTimer(sec) {
  const el = document.getElementById('paymentTimer')
  if (lockInterval) clearInterval(lockInterval)
  lockInterval = setInterval(() => {
    const m = Math.floor(sec/60), s = sec%60
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; el.style.color = sec<60?'var(--danger)':''
    if (sec<=0) {
      clearInterval(lockInterval); lockInterval=null; releaseSeats()
      notify('Your seat hold expired. Please select seats again.', 'warning')
      document.getElementById('paymentSection').style.display='none'; document.getElementById('proceedBtn').style.display='block'; document.getElementById('proceedBtn').disabled=false
    }
    sec--
  }, 1000)
}

async function releaseSeats() {
  if (lockInterval) { clearInterval(lockInterval); lockInterval=null }
  if (!selectedSeats.length) return
  try { await API.releaseSeats(selectedShow, selectedSeats) } catch {}
}

function showSuccess(bookingId, amt, ticketIds) {
  const firstTicket = ticketIds?.[0]
  const ticketLink = firstTicket ? `/ticket.html?ticket_id=${firstTicket}` : '/profile.html'
  document.getElementById('paymentSection').innerHTML = `<div class="booking-success"><div class="booking-success-icon">&#10003;</div><h2>Booking Confirmed!</h2><p class="text-muted">Booking ID: <strong class="mono">${esc(String(bookingId).slice(0,8))}…</strong></p><p>Amount paid: <strong>₹${esc(amt)}</strong></p><div class="booking-success-actions"><a href="${ticketLink}" class="btn btn-primary">View Ticket</a><a href="/events.html" class="btn btn-outline">More Events</a></div></div>`
  document.getElementById('seatMap').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-title">Booking complete!</div></div>'
  document.getElementById('summaryContent').innerHTML = ''
  notify('Booking confirmed! 🎉', 'success')
}

document.addEventListener('DOMContentLoaded', loadEvent)
window.addEventListener('beforeunload', () => {
  if (razorpayOrder) return
  releaseSeats()
})
