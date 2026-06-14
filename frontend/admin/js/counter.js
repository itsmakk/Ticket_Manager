async function loadCounterEvents() {
  const sel = document.getElementById('counterShow')
  const events = await API.adminEvents('list')
  sel.innerHTML = '<option value="">Select Show</option>'+(events||[]).filter(e=>e.status==='Active').map(e => `<option value="${e.id}">${e.title}</option>`).join('')
}
async function loadCounterSeats() {
  const sid = document.getElementById('counterShow').value
  const sec = document.getElementById('counterSeatArea')
  if (!sid) { sec.innerHTML = ''; return }
  const events = await API.adminEvents('list')
  const event = events.find(e => e.id === sid) || events[0]
  if (!event) return
  const shows = await API.getShows(event.id)
  const show = shows.find(s => s.id === sid) || shows[0]
  if (!show) return
  const { seats } = await API.getSeatMap(sid)
  let html = '<div class="screen-indicator">SCREEN</div><div class="seat-layout">'
  Object.entries(seats||{}).forEach(([r, row]) => {
    html += `<div class="seat-row"><span class="seat-row-label">${r}</span>`
    html += row.map(s => `<div class="seat ${s.status}" onclick="selectCounterSeat('${s.id}')" title="${s.seat_number} (${s.category})">${s.seat_number.replace(r,'')}</div>`).join('')
    html += '</div>'
  })
  html += '</div>'
  sec.innerHTML = html
}
const selectedCounterSeats = []
function selectCounterSeat(seatId) {
  const idx = selectedCounterSeats.indexOf(seatId)
  if (idx === -1) selectedCounterSeats.push(seatId)
  else selectedCounterSeats.splice(idx, 1)
  document.getElementById('counterSelectedSeats').innerHTML = `<p>Selected: ${selectedCounterSeats.length > 0 ? selectedCounterSeats.length + ' seat(s)' : 'Select seats to book.'}</p>`
}
document.getElementById('counterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const sid = document.getElementById('counterShow').value
  const name = document.getElementById('counterName').value
  const mobile = document.getElementById('counterMobile').value
  const email = document.getElementById('counterEmail').value
  const payment = document.getElementById('counterPayment').value
  if (!sid || !name || !mobile) return alert('Fill required fields')
  if (!selectedCounterSeats.length) return alert('Select at least one seat')
  const events = await API.adminEvents('list')
  const event = events.find(e => e.id === sid) || events[0]
  if (!event) return alert('Event not found')
  const shows = await API.getShows(event.id)
  const show = shows.find(s => s.id === sid)
  if (!show) return alert('Show not found')
  const seats = await API.adminSeats('list', { show_id: sid })
  const selected = seats.filter(s => selectedCounterSeats.includes(s.id))
  if (!selected.length) return alert('Selected seats not available')
  const prices = { premium: show.price_premium, gold: show.price_gold, silver: show.price_silver }
  const total = selected.reduce((sum, s) => sum + (prices[s.category] || 200), 0)
  await API.lockSeats(sid, selectedCounterSeats)
  const sb = window.__apiSupabase
  let uid = email
  if (email) {
    const { data: { user } } = await sb.auth.admin?.createUser({ email, password: 'Temp123!', email_confirm: true, user_metadata: { full_name: name } }) || { data: { user: null } }
    if (user) uid = user.id
  }
  await API.verifyPayment({
    razorpay_order_id: 'counter', razorpay_payment_id: 'counter-' + Date.now(), razorpay_signature: 'counter',
    show_id: sid, event_id: event.id,
    seats: selected.map(s => ({ seat_id: s.id, category: s.category })),
    total_amount: total, discount_amount: 0, promo_code_id: null,
    user_id: uid, booking_source: 'COUNTER',
  })
  alert('Booking successful!')
  selectedCounterSeats.length = 0
  document.getElementById('counterSelectedSeats').innerHTML = '<p>Select seats to book.</p>'
  loadCounterSeats()
})
document.addEventListener('DOMContentLoaded', loadCounterEvents)
