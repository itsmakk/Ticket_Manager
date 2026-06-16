async function loadCounterEvents() {
  try {
    const sel = document.getElementById('counterShow')
    if (!sel) return
    const shows = await API.counterShows()
    sel.innerHTML = '<option value="">Select Show</option>' + (shows || []).map(show => {
      const eventTitle = show.events?.title || 'Event'
      return `<option value="${show.id}">${eventTitle} - ${show.show_date} ${show.start_time}</option>`
    }).join('')
  } catch(err) {
    console.error(err)
    const el = document.getElementById('counterShow')
    if (el) el.innerHTML = '<option value="">Error loading shows</option>'
  }
}
async function loadCounterSeats() {
  try {
    const sid = document.getElementById('counterShow').value
    const sec = document.getElementById('counterSeatArea')
    if (!sid) { sec.innerHTML = ''; return }
    selectedCounterSeats.length = 0
    document.getElementById('counterSelectedSeats').innerHTML = '<p>Select seats to book.</p>'
    const { seats } = await API.getSeatMap(sid)
    let html = '<div class="screen-indicator">SCREEN</div><div class="seat-layout">'
    Object.entries(seats||{}).forEach(([r, row]) => {
      html += `<div class="seat-row"><span class="seat-row-label">${r}</span>`
      html += row.map(s => `<div class="seat ${s.status} category-${s.category}" data-seat-id="${s.id}" title="${s.seat_number} (${s.category})">${s.seat_number.replace(r,'')}</div>`).join('')
      html += '</div>'
    })
    html += '</div>'
    sec.innerHTML = html
    sec.querySelectorAll('.seat[data-seat-id]').forEach(el => el.addEventListener('click', () => selectCounterSeat(el.dataset.seatId)))
  } catch(err) {
    console.error(err)
    document.getElementById('counterSeatArea').innerHTML = '<div class="alert alert-danger">Failed to load seats</div>'
  }
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
  const btn = e.target.querySelector('button[type="submit"]')
  try {
    const sid = document.getElementById('counterShow').value
    const name = document.getElementById('counterName').value
    const mobile = document.getElementById('counterMobile').value
    const email = document.getElementById('counterEmail').value
    const payment = document.getElementById('counterPayment').value
    if (!sid || !name || !mobile) return alert('Fill required fields')
    if (!selectedCounterSeats.length) return alert('Select at least one seat')
    if (btn) { btn.disabled = true; btn.textContent = 'Booking...' }
    const shows = await API.counterShows()
    const show = (shows || []).find(s => s.id === sid)
    if (!show) return alert('Show not found')
    const seatMap = await API.getSeatMap(sid)
    const seats = Object.values(seatMap?.seats || {}).flat()
    const selected = seats.filter(s => selectedCounterSeats.includes(s.id))
    if (!selected.length) return alert('Selected seats not available')
    const prices = { premium: show.price_premium, gold: show.price_gold, silver: show.price_silver }
    const total = selected.reduce((sum, s) => sum + (isNaN(parseFloat(prices[s.category])) ? 0 : parseFloat(prices[s.category])), 0)
    await API.lockSeats(sid, selectedCounterSeats)
    await API.verifyPayment({
      razorpay_order_id: 'counter', razorpay_payment_id: 'counter-' + Date.now(), razorpay_signature: 'counter',
      show_id: sid, event_id: show.event_id,
      seats: selected.map(s => ({ seat_id: s.id, category: s.category })),
      total_amount: total, discount_amount: 0, promo_code_id: null,
      payment_mode: payment,
      customer_name: name, customer_mobile: mobile, customer_email: email || undefined,
    })
    alert('Booking successful!')
    selectedCounterSeats.length = 0
    document.getElementById('counterSelectedSeats').innerHTML = '<p>Select seats to book.</p>'
    loadCounterSeats()
  } catch (err) {
    alert('Booking failed: ' + err.message)
    try { API.releaseSeats(document.getElementById('counterShow')?.value, selectedCounterSeats) } catch {}
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Book Seats' }
  }
})
document.addEventListener('DOMContentLoaded', loadCounterEvents)
