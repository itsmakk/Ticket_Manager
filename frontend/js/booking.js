// Booking flow — ALL data through API (Edge Functions)
let selectedShow = null, selectedSeats = [], selectedSeatData = [], lockInterval = null
let promoDiscount = 0, promoCodeId = null, razorpayOrder = null
const eventId = new URLSearchParams(location.search).get('id')

function getSB() { return window.__apiSupabase || window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) }

async function loadEvent() {
  if (!eventId) { document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">No event specified.</div>'; return }
  try {
    const events = await API.getEvents()
    const event = events.find(e => e.id === eventId)
    if (!event) { document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">Event not found.</div>'; return }
    document.getElementById('eventDetail').innerHTML = `
      <div class="card">
        ${event.poster_url ? `<img src="${event.poster_url}" alt="${event.title}" style="width:100%;max-height:300px;object-fit:cover;border-radius:var(--radius);margin-bottom:1rem;" />` : ''}
        <h1>${event.title}</h1>
        <p style="color:var(--gray-500);margin-top:0.5rem;">${event.description || ''}</p>
        <p><span class="badge badge-primary">${event.category || 'Event'}</span></p>
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
    const today = new Date().toISOString().split('T')[0]
    grid.innerHTML = shows.map(s => `<div class="card event-card" style="cursor:pointer;${selectedShow===s.id?'border:2px solid var(--primary);':''}" onclick="selectShow('${s.id}')">
      <div class="event-card-body">
        <h4>${s.show_date}</h4>
        <p style="font-size:1.2rem;font-weight:600;">${s.start_time}</p>
        <p style="font-size:0.85rem;color:var(--gray-500);">Premium: ₹${s.price_premium} | Gold: ₹${s.price_gold} | Silver: ₹${s.price_silver}</p>
        ${s.show_date < today ? '<span class="badge badge-danger">Expired</span>' : `<span class="badge badge-${s.status==='Active'?'success':'primary'}">${s.status}</span>`}
      </div>
    </div>`).join('')
  } catch (err) { console.error(err) }
}

async function selectShow(id) {
  selectedShow = id; selectedSeats = []; selectedSeatData = []; promoDiscount = 0; promoCodeId = null; razorpayOrder = null
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
    if (!show || !seats) { document.getElementById('seatMap').innerHTML = '<p style="color:var(--gray-500);">No seating layout.</p>'; return }
    const html = Object.entries(seats).map(([row, rowSeats]) => `
      <div class="seat-row"><span class="seat-row-label">${row}</span>
        ${rowSeats.map(s => { const sel = selectedSeats.includes(s.id); return `<div class="seat ${sel?'selected':s.status}" ${(s.status==='available'||sel)?`onclick="toggleSeat('${s.id}','${s.seat_number}','${s.category}')"`:''} title="${s.seat_number} (${s.category})">${s.seat_number.replace(row,'')}</div>` }).join('')}
        <span class="seat-row-label">${row}</span>
      </div>`).join('')
    document.getElementById('seatMap').innerHTML = `<div class="screen-indicator">SCREEN</div><div class="seat-layout">${html}</div>
      <div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;font-size:0.85rem;">
        <span><span class="seat available" style="width:1rem;height:1rem;display:inline-block;"></span> Available</span>
        <span><span class="seat selected" style="width:1rem;height:1rem;display:inline-block;"></span> Selected</span>
        <span><span class="seat booked" style="width:1rem;height:1rem;display:inline-block;"></span> Booked</span>
        <span><span class="seat locked" style="width:1rem;height:1rem;display:inline-block;"></span> Locked</span>
      </div>`
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
    const { show } = await API.getSeatMap(selectedShow)
    let sub = 0; const det = selectedSeatData.map(x => { const p=parseFloat(show['price_'+x.category]||200); sub+=p; return x.seat_number+' ('+x.category+' - ₹'+p+')' }).join(', ')
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
    const order = await API.createOrder(selectedShow, selectedSeatData, code)
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
    razorpayOrder = await API.createOrder(selectedShow, selectedSeatData, document.getElementById('promoInput').value.trim().toUpperCase()||undefined)
    if (razorpayOrder.is_free) { await completeFree(session); return }
    document.getElementById('proceedBtn').style.display = 'none'; document.getElementById('paymentSection').style.display = 'block'
    startLockTimer(300)
  } catch (err) { alert('Error: '+err.message); await releaseSeats() }
  btn.disabled = false; btn.textContent = 'Proceed to Payment'
}

async function completeFree(session) {
  const r = await API.verifyPayment({ razorpay_order_id:'free', razorpay_payment_id:'free', razorpay_signature:'free', show_id:selectedShow, event_id:eventId, seats:selectedSeatData, total_amount:0, discount_amount:promoDiscount, promo_code_id:promoCodeId, user_id:session.user.id, booking_source:'USER' })
  if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]
  showSuccess(r.booking_id, 0)
}

function initiatePayment() {
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
        if (lockInterval) clearInterval(lockInterval); selectedSeats=[]; selectedSeatData=[]; showSuccess(r.booking_id, razorpayOrder.amount)
      } catch (err) { alert('Failed: '+err.message); btn.disabled=false; btn.textContent='Pay Now'; await releaseSeats() }
    },
    modal: { ondismiss: async () => { await releaseSeats(); document.getElementById('paymentSection').style.display='none'; document.getElementById('proceedBtn').style.display='block' } },
    theme: { color: '#1e40af' },
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

function showSuccess(id, amt) {
  document.getElementById('paymentSection').innerHTML = `<div style="text-align:center;padding:2rem;"><div style="font-size:3rem;color:var(--success);">&#10003;</div><h2 style="color:var(--success);">Booking Confirmed!</h2><p>ID: <strong style="font-family:monospace;">${id.slice(0,8)}...</strong></p><p>Amount: <strong>₹${amt}</strong></p><div style="margin-top:1rem;"><a href="/profile.html" class="btn btn-primary">View Tickets</a><a href="/events.html" class="btn btn-outline">More Events</a></div></div>`
  document.getElementById('seatMap').innerHTML = '<p style="text-align:center;color:var(--success);font-size:1.2rem;">Booking complete!</p>'
  document.getElementById('summaryContent').innerHTML = ''
}

document.addEventListener('DOMContentLoaded', loadEvent)
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => { e.preventDefault(); await releaseSeats(); const sb=getSB(); await sb.auth.signOut(); localStorage.removeItem('sb-token'); localStorage.removeItem('sb-user'); location.href='/' })
window.addEventListener('beforeunload', () => releaseSeats())
