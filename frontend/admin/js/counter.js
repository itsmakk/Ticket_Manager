// Counter Booking — Admin Staff Only
// Fixes applied:
//   BUG-C1: Only available seats are selectable (click handlers only on status==='available')
//   BUG-C2: CSS 'selected' class toggled for visual feedback
//   BUG-C3: Seat labels shown in selected-seats panel
//   BUG-C4: Form + seat selection reset after successful booking
//   BUG-C5: Show pricing cached from getSeatMap, no redundant counterShows() on submit
//   BUG-C6: #counterSummary populated with amount before booking

let cachedShowPricing = null  // { price_premium, price_gold, price_silver }
const selectedCounterSeats = []   // [{ id, seat_number, category }]
const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)
function notify(m, type) { if (window.UI) UI.toast(m, type); else alert(m) }

async function loadCounterEvents() {
  try {
    const sel = document.getElementById('counterShow')
    if (!sel) return
    const shows = await API.counterShows()
    sel.innerHTML = '<option value="">Select Show</option>' + (shows || []).map(show => {
      const eventTitle = show.events?.title || 'Event'
      return `<option value="${esc(show.id)}">${esc(eventTitle)} — ${esc(show.show_date)} ${esc(show.start_time)}</option>`
    }).join('')
  } catch (err) {
    console.error(err)
    const el = document.getElementById('counterShow')
    if (el) el.innerHTML = '<option value="">Error loading shows</option>'
  }
}

async function loadCounterSeats() {
  const sid = document.getElementById('counterShow')?.value
  const sec = document.getElementById('counterSeatArea')
  if (!sid) {
    if (sec) sec.innerHTML = ''
    resetSeatSelection()
    cachedShowPricing = null
    return
  }
  // Reset selection state whenever show changes
  resetSeatSelection()
  if (sec) sec.innerHTML = '<p style="color:var(--gray-500)">Loading seat map…</p>'
  try {
    const { show, seats } = await API.getSeatMap(sid)
    if (!show || !seats) {
      sec.innerHTML = '<p style="color:var(--gray-500)">No seating layout found.</p>'
      cachedShowPricing = null
      return
    }
    // Cache pricing for use during booking
    cachedShowPricing = {
      price_premium: show.price_premium,
      price_gold: show.price_gold,
      price_silver: show.price_silver,
    }
    let html = '<div class="screen-indicator">SCREEN</div><div class="seat-layout">'
    Object.entries(seats || {}).forEach(([r, row]) => {
      html += `<div class="seat-row"><span class="seat-row-label">${r}</span>`
      html += row.map(s => {
        const isAvailable = s.status === 'available'
        // BUG-C1 FIX: Only available seats get data-seat-id and click handlers
        if (isAvailable) {
          return `<div class="seat available category-${s.category}" data-seat-id="${s.id}" data-seat-num="${s.seat_number}" data-seat-cat="${s.category}" title="${s.seat_number} (${s.category})">${s.seat_number.replace(r, '')}</div>`
        }
        return `<div class="seat ${s.status} category-${s.category}" title="${s.seat_number} (${s.category}) — ${s.status}">${s.seat_number.replace(r, '')}</div>`
      }).join('')
      html += `<span class="seat-row-label">${r}</span></div>`
    })
    html += '</div>'
    html += `<div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;font-size:0.85rem;">
      <span><span class="seat category-premium" style="width:1rem;height:1rem;display:inline-block;"></span> Premium</span>
      <span><span class="seat category-gold" style="width:1rem;height:1rem;display:inline-block;"></span> Gold</span>
      <span><span class="seat category-silver" style="width:1rem;height:1rem;display:inline-block;"></span> Silver</span>
      <span><span class="seat selected" style="width:1rem;height:1rem;display:inline-block;"></span> Selected</span>
      <span><span class="seat booked" style="width:1rem;height:1rem;display:inline-block;"></span> Booked</span>
      <span><span class="seat locked" style="width:1rem;height:1rem;display:inline-block;"></span> Locked</span>
      <span><span class="seat blocked" style="width:1rem;height:1rem;display:inline-block;"></span> Blocked</span>
    </div>`
    sec.innerHTML = html
    // BUG-C1 FIX: Only available seats get click handlers
    sec.querySelectorAll('.seat[data-seat-id]').forEach(el =>
      el.addEventListener('click', () => selectCounterSeat(el.dataset.seatId, el.dataset.seatNum, el.dataset.seatCat))
    )
  } catch (err) {
    console.error(err)
    if (sec) sec.innerHTML = '<div class="alert alert-danger">Failed to load seats. Please try again.</div>'
    cachedShowPricing = null
  }
}

function selectCounterSeat(seatId, seatNum, seatCat) {
  const idx = selectedCounterSeats.findIndex(s => s.id === seatId)
  if (idx === -1) {
    selectedCounterSeats.push({ id: seatId, seat_number: seatNum, category: seatCat })
  } else {
    selectedCounterSeats.splice(idx, 1)
  }
  // BUG-C2 FIX: Toggle 'selected' CSS class on the seat element
  const el = document.querySelector(`.seat[data-seat-id="${seatId}"]`)
  if (el) el.classList.toggle('selected', selectedCounterSeats.some(s => s.id === seatId))
  updateCounterSummary()
}

function updateCounterSummary() {
  const panel = document.getElementById('counterSelectedSeats')
  const summaryDiv = document.getElementById('counterSummary')

  if (!selectedCounterSeats.length) {
    if (panel) panel.innerHTML = '<p style="color:var(--gray-500)">Select seats to book.</p>'
    if (summaryDiv) summaryDiv.style.display = 'none'
    return
  }

  // BUG-C3 FIX: Show individual seat labels, not just count
  const seatLabels = selectedCounterSeats.map(s =>
    `<span class="badge badge-primary" style="margin:2px;">${s.seat_number} <small>(${s.category})</small></span>`
  ).join('')
  if (panel) panel.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:0.5rem;">${seatLabels}</div><p><strong>${selectedCounterSeats.length} seat(s) selected</strong></p>`

  // BUG-C6 FIX: Populate summary card with amount
  if (summaryDiv && cachedShowPricing) {
    const prices = { premium: cachedShowPricing.price_premium, gold: cachedShowPricing.price_gold, silver: cachedShowPricing.price_silver }
    const total = selectedCounterSeats.reduce((sum, s) => {
      const p = parseFloat(prices[s.category])
      return sum + (isNaN(p) ? 0 : p)
    }, 0)
    const breakdown = selectedCounterSeats.map(s => {
      const p = parseFloat(prices[s.category])
      return `<div style="display:flex;justify-content:space-between;"><span>${s.seat_number} (${s.category})</span><span>₹${isNaN(p) ? '?' : p}</span></div>`
    }).join('')
    summaryDiv.innerHTML = `
      <h4 style="margin:0 0 0.5rem;">Booking Summary</h4>
      ${breakdown}
      <hr style="margin:0.5rem 0;" />
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;">
        <span>Total</span><span style="color:var(--primary);">₹${total}</span>
      </div>`
    summaryDiv.style.display = 'block'
  }
}

function resetSeatSelection() {
  selectedCounterSeats.length = 0
  const panel = document.getElementById('counterSelectedSeats')
  if (panel) panel.innerHTML = '<p style="color:var(--gray-500)">Select seats to book.</p>'
  const summaryDiv = document.getElementById('counterSummary')
  if (summaryDiv) summaryDiv.style.display = 'none'
}

document.getElementById('counterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = e.target.querySelector('button[type="submit"]')
  try {
    const sid = document.getElementById('counterShow').value
    const name = document.getElementById('counterName').value.trim()
    const mobile = document.getElementById('counterMobile').value.trim()
    const email = document.getElementById('counterEmail').value.trim()
    const payment = document.getElementById('counterPayment').value

    if (!sid) { notify('Please select a show', 'warning'); return }
    if (!name || !mobile) { notify('Customer name and mobile are required', 'warning'); return }
    if (!selectedCounterSeats.length) { notify('Select at least one seat', 'warning'); return }
    if (!/^\d{10}$/.test(mobile)) { notify('Mobile number must be exactly 10 digits', 'warning'); return }

    if (btn) { btn.disabled = true; btn.textContent = 'Booking…' }

    // BUG-C5 FIX: Use cached pricing from getSeatMap instead of calling counterShows() again
    if (!cachedShowPricing) {
      // Fallback: reload seat map if pricing cache was lost
      await loadCounterSeats()
      if (!cachedShowPricing) throw new Error('Show pricing not available. Please re-select the show.')
    }

    // Re-fetch seat map to get fresh seat data (status validation) and show event_id
    const seatMap = await API.getSeatMap(sid)
    const allSeats = Object.values(seatMap?.seats || {}).flat()
    const show = seatMap?.show

    if (!show) throw new Error('Show data not available')

    const selected = allSeats.filter(s => selectedCounterSeats.some(cs => cs.id === s.id))
    if (selected.length !== selectedCounterSeats.length) {
      throw new Error('Some selected seats are no longer available. Please re-select.')
    }

    // Check all selected seats are still available
    const unavailable = selected.filter(s => s.status !== 'available')
    if (unavailable.length) {
      throw new Error(`Seat(s) ${unavailable.map(s => s.seat_number).join(', ')} are no longer available`)
    }

    const prices = {
      premium: cachedShowPricing.price_premium,
      gold: cachedShowPricing.price_gold,
      silver: cachedShowPricing.price_silver,
    }
    const total = selected.reduce((sum, s) => sum + (isNaN(parseFloat(prices[s.category])) ? 0 : parseFloat(prices[s.category])), 0)

    await API.lockSeats(sid, selectedCounterSeats.map(s => s.id))
    await API.verifyPayment({
      razorpay_order_id: 'counter',
      razorpay_payment_id: 'counter-' + Date.now(),
      razorpay_signature: 'counter',
      show_id: sid,
      event_id: show.event_id,
      seats: selected.map(s => ({ seat_id: s.id, category: s.category })),
      total_amount: total,
      discount_amount: 0,
      promo_code_id: null,
      payment_mode: payment,
      customer_name: name,
      customer_mobile: mobile,
      customer_email: email || undefined,
    })

    notify(`Booking successful — ${selected.length} ticket(s) for ${name}, ₹${total} (${payment})`, 'success')

    // BUG-C4 FIX: Reset form and seat selection after successful booking
    document.getElementById('counterName').value = ''
    document.getElementById('counterMobile').value = ''
    document.getElementById('counterEmail').value = ''
    resetSeatSelection()
    await loadCounterSeats()   // Reload seat map to reflect booked status
  } catch (err) {
    notify('Booking failed: ' + err.message, 'error')
    try {
      const sid = document.getElementById('counterShow')?.value
      if (sid && selectedCounterSeats.length) {
        API.releaseSeats(sid, selectedCounterSeats.map(s => s.id)).catch(() => {})
      }
    } catch {}
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Confirm Booking & Generate Ticket' }
  }
})

document.addEventListener('DOMContentLoaded', loadCounterEvents)
