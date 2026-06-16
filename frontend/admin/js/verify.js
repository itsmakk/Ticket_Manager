let lastResult = null, scanner = null

async function verifyTicket(id) {
  const input = id || document.getElementById('ticketId').value.trim()
  const rDiv = document.getElementById('verifyResult')
  if (!input) return
  try {
    if (input.length === 36) {
      const t = await API.getTicket(input)
      lastResult = t
      rDiv.innerHTML = `<div class="card"><p><strong>Ticket:</strong> ${t.ticket_id}</p><p><strong>Event:</strong> ${t.event_title}</p><p><strong>Date:</strong> ${t.show_date} ${t.show_time}</p>${t.seat ? `<p><strong>Seat:</strong> ${t.seat.seat_number} (${t.seat.row_label}) ${t.seat.category ? '- ' + t.seat.category : ''}</p>` : ''}<p><strong>Status:</strong> <span class="badge badge-${t.status==='Valid'?'success':'warning'}">${t.status}</span></p></div>`
    } else {
      const v = await API.verifyTicket(input)
      lastResult = v
      rDiv.innerHTML = `<div class="card"><p><strong>Valid:</strong> ${v.valid?'Yes':'No'}</p>${v.ticket?.seat ? `<p><strong>Seat:</strong> ${v.ticket.seat.seat_number} (${v.ticket.seat.row_label}) ${v.ticket.seat.category ? '- ' + v.ticket.seat.category : ''}</p>` : ''}</div>`
    }
  } catch(err) { rDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

async function toggleScanner() {
  const container = document.getElementById('scannerContainer')
  const btn = document.getElementById('scanBtn')
  if (scanner) {
    await scanner.stop()
    scanner = null
    container.style.display = 'none'
    btn.textContent = 'Scan QR'
    return
  }
  container.style.display = 'block'
  btn.textContent = 'Stop'
  scanner = new Html5Qrcode('scannerContainer')
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        document.getElementById('ticketId').value = decodedText
        scanner.stop()
        scanner = null
        container.style.display = 'none'
        btn.textContent = 'Scan QR'
        verifyTicket(decodedText)
      },
      () => {}
    )
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Camera error: ${err.message}</p>`
    btn.textContent = 'Scan QR'
  }
}

document.addEventListener('DOMContentLoaded', () => {})
