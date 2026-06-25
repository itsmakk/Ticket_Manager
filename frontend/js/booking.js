// Booking flow — ALL data through API (Edge Functions)
let selectedShow = null, selectedSeats = [], selectedSeatData = [], lockInterval = null
let promoDiscount = 0, promoCodeId = null, razorpayOrder = null, cachedShowPricing = null
const eventId = new URLSearchParams(location.search).get('id')


async function loadEvent() {
  if (!eventId) { document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">No event specified.</div>'; return }
  try {
    const events = await API.getEvents()
    const event = events.find(e => e.id === eventId)
    if (!event) { document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">Event not found.</div>'; return }
    function getYoutubeEmbedUrl(url) {
      if (!url) return null
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      return match ? `https://www.youtube.com/embed/${match[1]}` : null
    }
    const hasTrailer = event.trailer_url && getYoutubeEmbedUrl(event.trailer_url)
    const posterHtml = event.poster_url
      ? `<img src="${event.poster_url}" alt="${event.title}" />`
      : '<div class="event-poster-placeholder">No poster</div>'
    document.getElementById('eventDetail').innerHTML = `
      <div class="event-detail">
        <div class="event-poster-wrap">${posterHtml}</div>
        <div class="event-info">
          <div class="event-meta"><span class="badge badge-primary">${event.category || 'Event'}</span></div>
          <h1>${event.title}</h1>
          <div class="event-description">${event.description || ''}</div>
          <div class="event-actions">
            ${hasTrailer ? `<button class="btn btn-outline" data-trailer-url="${event.trailer_url}">▶ Trailer</button>` : ''}
          </div>
        </div>
      </div>`
    loadShows()
  } catch (err) { document.getElementById('eventDetail').innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

async function loadShows() {
  try {
    const shows = await API.getShows(eventId)
    const container = document.getElementById('showSelector'); const grid = document.getElementById('showsGrid')
    if (!shows?.length) { container.style.display = 'none'; return }
    container.style.display = 'block'
    grid.innerHTML = shows.map(s => `<div class="card show-card${selectedShow===s.id?' selected':''}" data-show-id="${s.id}">
      <div class="event-card-body">
        <h4>${s.show_date}</h4>
        <p style="font-size:1.2rem;font-weight:600;">${s.start_time}</p>
        <p style="font-size:0.85rem;color:var(--text-secondary);">Premium: ₹${s.price_premium} | Gold: ₹${s.price_gold} | Silver: ₹${s.price_silver}</p>
        <span class="badge badge-${s.status==='Active'?'success':'primary'}">${s.status}</span>
      </div>
    </div>`).join('')
    grid.className = 'shows-grid'
    grid.querySelectorAll('.show-card').forEach(el => el.addEventListener('click', () => selectShow(el.dataset.showId)))
  } catch (err) { console.error(err) }
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
  try {
    const { show, seats } = await API.getSeatMap(selectedShow)
    if (!show || !seats) { document.getElementById('seatMap').innerHTML = '<p style="color:var(--text-secondary);">No seating layout.</p>'; return }
    cachedShowPricing = {
      price_premium: show.price_premium,
      price_gold: show.price_gold,
      price_silver: show.price_silver
    }
    const html = Object.entries(seats).map(([row, rowSeats]) => `
      <div class="seat-row"><span class="seat-row-label">${row}</span>
        ${rowSeats.map(s => { const sel = selectedSeats.includes(s.id); return `<div class="seat ${sel?'selected':s.status} category-${s.category}" ${(s.status==='available'||sel)?`data-seat-id="${s.id}" data-seat-num="${s.seat_number}" data-seat-cat="${s.category}"`:''} title="${s.seat_number} (${s.category})">${s.seat_number.replace(row,'')}</div>` }).join('')}
        <span class="seat-row-label">${row}</span>
      </div>`).join('')
    document.getElementById('seatMap').innerHTML = `<div class="seat-map-scroll"><div class="screen-indicator">SCREEN</div><div class="seat-layout">${html}</div></div>
      <div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;font-size:0.85rem;">
        <span><span class="seat category-premium" style="width:1rem;height:1rem;display:inline-block;"></span> Premium</span>
        <span><span class="seat category-gold" style="width:1rem;height:1rem;display:inline-block;"></span> Gold</span>
        <span><span class="seat category-silver" style="width:1rem;height:1rem;display:inline-block;"></span> Silver</span>
        <span><span class="seat selected" style="width:1rem;height:1rem;display:inline-block;"></span> Selected</span>
        <span><span class="seat booked" style="width:1rem;height:1rem;display:inline-block;"></span> Booked</span>
        <span><span class="seat locked" style="width:1rem;height:1rem;display:inline-block;"></span> Locked</span>
        <span><span class="seat blocked" style="width:1rem;height:1rem;display:inline-block;"></span> Blocked</span>
      </div>`
    document.getElementById('seatMap').querySelectorAll('.seat[data-seat-id]').forEach(el => {
      el.addEventListener('click', () => toggleSeat(el.dataset.seatId, el.dataset.seatNum, el.dataset.seatCat))
    })
  } catch (err) { document.getElementById('seatMap').innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

function toggleSeat(id, num, cat) {
  const idx = selectedSeats.indexOf(id)
  if (idx > -1) { selectedSeats.splice(idx,1); selectedSeatData.splice(idx,1) }
  else { selectedSeats.push(id); selectedSeatData.push({seat_id:id, seat_number:num, category:cat}) }
  loadSeatMap(); updateSummary()
}

async function updateSummary() {
  const s = document.getElementById('summaryContent'); const pb = document.getElementById('proceedBtn')
  if (!selectedSeats.length) { s.innerHTML = '<p style="color:var(--gray-500);">Select seats.</p>'; pb.disabled = true; return }
  try {
    if (!cachedShowPricing) {
      const { show } = await API.getSeatMap(selectedShow)
      if (!show) throw new Error('Show data not available')
      cachedShowPricing = {
        price_premium: show.price_premium,
        price_gold: show.price_gold,
        price_silver: show.price_silver
      }
    }
    const show = cachedShowPricing
    let sub = 0; const det = selectedSeatData.map(x => { const price = parseFloat(show['price_'+x.category]); const p = isNaN(price) ? 0 : price; sub+=p; return x.seat_number+' ('+x.category+' - ₹'+p+')' }).join(', ')
    const total = Math.max(0, sub - promoDiscount)
    s.innerHTML = `<p><strong>Seats:</strong> ${det}</p><p><strong>Subtotal:</strong> ₹${sub}</p>${promoDiscount>0?`<p><strong>Discount:</strong> -₹${promoDiscount}</p>`:''}<p style="font-size:1.3rem;font-weight:700;color:var(--primary);"><strong>Total:</strong> ₹${total}</p>`
    pb.disabled = false
  } catch (err) { s.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

async function applyPromo() {
  const code = document.getElementById('promoInput').value.trim().toUpperCase()
  const msg = document.getElementById('promoMessage')
  if (!code) { msg.textContent=''; return }
  try {
    const order = await API.createOrder(selectedShow, selectedSeatData, code, eventId, true)
    promoDiscount = order.discount_amount || 0; promoCodeId = order.promo_code_id || null
    msg.innerHTML = promoDiscount > 0 ? `<span style="color:var(--success);">Discount applied! -₹${promoDiscount}</span>` : '<span style="color:var(--danger);">Invalid code.</span>'
    updateSummary()
  } catch (err) { msg.innerHTML=`<span style="color:var(--danger);">${err.message}</span>`; promoDiscount=0; promoCodeId=null; updateSummary() }
}

async function proceedToPayment() {
  const sb = getSB(); const { data: { session } } = await sb.auth.getSession()
  if (!session) { location.href = `/login.html?redirect=/event-detail.html?id=${eventId}`; return }
  if (!selectedSeats.length) return
  const btn = document.getElementById('proceedBtn'); btn.disabled = true; btn.textContent = 'Processing...'
  try {
    await API.lockSeats(selectedShow, selectedSeats)
    razorpayOrder = await API.createOrder(selectedShow, selectedSeatData, document.getElementById('promoInput').value.trim().toUpperCase()||undefined, eventId)
    if (razorpayOrder.is_free) { await completeFree(session); return }
    document.getElementById('proceedBtn').style.display = 'none'; document.getElementById('paymentSection').style.display = 'block'
    startLockTimer(300)
  } catch (err) { alert('Error: '+err.message); await releaseSeats() }
  btn.disabled = false; btn.textContent = 'Proceed to Payment'
}

async function completeFree(session) {
  const r = await API.verifyPayment({ razorpay_order_id:'free', razorpay_payment_id:'free', razorpay_signature:'free', show_id:selectedShow, event_id:eventId, seats:selectedSeatData, total_amount:0, discount_amount:promoDiscount, promo_code_id:promoCodeId, user_id:session.user.id, booking_source:'USER' })
  if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]
  showSuccess(r.booking_id, 0, (r.tickets||[]).map(t => t.ticket_id))
}

function initiatePayment() {
  if (typeof Razorpay === 'undefined') {
    alert('Razorpay payment gateway is not loaded. Please refresh the page or check your internet connection.')
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
      const btn = document.getElementById('payBtn'); btn.disabled=true; btn.textContent='Verifying...'
      try {
        const r = await API.verifyPayment({ razorpay_order_id:res.razorpay_order_id, razorpay_payment_id:res.razorpay_payment_id, razorpay_signature:res.razorpay_signature, show_id:selectedShow, event_id:eventId, seats:selectedSeatData, total_amount:razorpayOrder.amount, discount_amount:promoDiscount, promo_code_id:promoCodeId, user_id:session.user.id, booking_source:'USER' })
        if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]; showSuccess(r.booking_id, razorpayOrder.amount, (r.tickets||[]).map(t => t.ticket_id))
      } catch (err) { alert('Failed: '+err.message); btn.disabled=false; btn.textContent='Pay Now'; await releaseSeats() }
    },
    modal: { ondismiss: async () => { await releaseSeats(); document.getElementById('paymentSection').style.display='none'; document.getElementById('proceedBtn').style.display='block' } },
    theme: { color: '#1e40af' },
    timeout: 300,
  }).open()
}

function startLockTimer(sec) {
  const el = document.getElementById('paymentTimer')
  if (lockInterval) clearInterval(lockInterval)
  lockInterval = setInterval(() => {
    const m = Math.floor(sec/60), s = sec%60
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; el.style.color = sec<60?'var(--danger)':''
    if (sec<=0) { clearInterval(lockInterval); lockInterval=null; releaseSeats(); alert('Session expired.'); document.getElementById('paymentSection').style.display='none'; document.getElementById('proceedBtn').style.display='block'; document.getElementById('proceedBtn').disabled=false }
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
  document.getElementById('paymentSection').innerHTML = `<div style="text-align:center;padding:2rem;"><div style="font-size:3rem;color:var(--success);">&#10003;</div><h2 style="color:var(--success);">Booking Confirmed!</h2><p style="color:var(--text-secondary);font-size:0.9rem;">Booking ID: <strong style="font-family:monospace;color:var(--text);">${bookingId.slice(0,8)}...</strong></p><p>Amount: <strong>₹${amt}</strong></p><div style="margin-top:1rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;"><a href="${ticketLink}" class="btn btn-primary">View Ticket</a><a href="/events.html" class="btn btn-outline">More Events</a></div></div>`
  document.getElementById('seatMap').innerHTML = '<p style="text-align:center;color:var(--success);font-size:1.2rem;">Booking complete!</p>'
  document.getElementById('summaryContent').innerHTML = ''
}

document.addEventListener('DOMContentLoaded', loadEvent)
window.addEventListener('beforeunload', () => {
  if (razorpayOrder) return
  releaseSeats()
})
