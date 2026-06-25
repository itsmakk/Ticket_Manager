;(async function() {
  const params = new URLSearchParams(location.search)
  const ticketId = params.get('ticket_id')
  const container = document.getElementById('ticketContainer')
  if (!ticketId) { container.innerHTML = '<div class="alert alert-danger">No ticket specified.</div>'; return }

  try {
    const sb = window.getSB?.()
    if (!sb) { container.innerHTML = '<div class="alert alert-danger">App not initialized.</div>'; return }
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { location.href = '/login.html?redirect=/ticket.html?ticket_id=' + ticketId; return }

    const data = await API.getTicket(ticketId)

    const status = data.status || 'Unknown'
    const seatInfo = data.seat
    const seatLabel = seatInfo ? `${seatInfo.row_label}${seatInfo.seat_number} (${seatInfo.category})` : 'N/A'
    const qrData = JSON.stringify({ ticket_id: data.ticket_id, token: (data.verification_token || '').slice(0, 20) })

    const isCancelled = status === 'Cancelled' || status === 'Used'
    const statusColor = status === 'Valid' ? 'var(--success)' : status === 'Used' ? 'var(--warning)' : 'var(--danger)'

    container.innerHTML = `
      <div class="ticket-page">
        <div class="ticket ${isCancelled ? 'ticket-cancelled' : ''}">
          ${isCancelled ? '<div class="ticket-stamp">' + status + '</div>' : ''}

          <div class="ticket-header">
            <div class="ticket-venue">
              <span class="ticket-venue-icon">🏛️</span>
              <span>Chhatrapati Shivaji Maharaj Auditorium</span>
            </div>
            <span class="ticket-status" style="color:${statusColor}">${status}</span>
          </div>

          <div class="ticket-body">
            <div class="ticket-event-section">
              <h1 class="ticket-event-title">${data.event_title || 'Event'}</h1>
              <div class="ticket-datetime">
                <span class="ticket-date">${data.show_date || 'TBD'}</span>
                <span class="ticket-time-sep">|</span>
                <span class="ticket-time">${data.show_time ? formatTicketTime(data.show_time) : 'TBD'}</span>
              </div>
            </div>
            <div class="ticket-divider">
              <div class="ticket-divider-dots"></div>
            </div>
            <div class="ticket-seat-section">
              <div class="ticket-qr">
                <canvas id="qrCanvas" width="180" height="180"></canvas>
              </div>
              <div class="ticket-seat-info">
                <div class="ticket-seat-label">Seat</div>
                <div class="ticket-seat-number">${seatInfo ? seatInfo.row_label + seatInfo.seat_number : '—'}</div>
                <div class="ticket-seat-category">${seatInfo ? seatInfo.category : ''}</div>
              </div>
            </div>
          </div>

          <div class="ticket-footer">
            <div class="ticket-footer-row">
              <span class="ticket-footer-label">Ticket ID</span>
              <span class="ticket-footer-value">${data.ticket_id}</span>
            </div>
            <div class="ticket-footer-row">
              <span class="ticket-footer-label">Customer</span>
              <span class="ticket-footer-value">${data.customer_name || '—'}</span>
            </div>
            <div class="ticket-footer-row">
              <span class="ticket-footer-label">Amount</span>
              <span class="ticket-footer-value">₹${data.total_amount || '0'}</span>
            </div>
          </div>
        </div>

        <div class="ticket-actions">
          <button class="btn btn-primary" onclick="downloadTicket()">Download Ticket</button>
          <a href="/profile.html" class="btn btn-outline">All Bookings</a>
        </div>
      </div>`

    QRCode.toCanvas(document.getElementById('qrCanvas'), qrData, {
      width: 180, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })

    window.downloadTicket = function() {
      const canvas = document.getElementById('qrCanvas')
      if (!canvas) return

      const w = 500, h = 700
      const offscreen = document.createElement('canvas')
      offscreen.width = w
      offscreen.height = h
      const ctx = offscreen.getContext('2d')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CSM Auditorium', w / 2, 35)

      ctx.font = '13px sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText('Chhatrapati Shivaji Maharaj Auditorium', w / 2, 58)
      ctx.fillText('Naval Station Karanja', w / 2, 76)

      ctx.beginPath()
      ctx.setLineDash([6, 6])
      ctx.moveTo(20, 90)
      ctx.lineTo(w - 20, 90)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      const title = data.event_title || 'Event'
      const lines = wrapText(ctx, title, w - 60, 22)
      let ty = 125
      for (const line of lines) {
        ctx.fillText(line, w / 2, ty)
        ty += 28
      }

      ctx.font = '15px sans-serif'
      ctx.fillStyle = '#475569'
      const dt = (data.show_date || 'TBD') + '  |  ' + (data.show_time ? formatTicketTime(data.show_time) : 'TBD')
      ctx.fillText(dt, w / 2, ty + 10)

      ty = ty + 35
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.moveTo(30, ty)
      ctx.lineTo(w - 30, ty)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])

      const qrSize = 180
      const qrX = (w - qrSize) / 2
      const qrY = ty + 15
      ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      const seatNum = seatInfo ? seatInfo.row_label + seatInfo.seat_number : '—'
      ctx.fillText(seatNum, w / 2, qrY + qrSize + 35)

      if (seatInfo) {
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(seatInfo.category.toUpperCase(), w / 2, qrY + qrSize + 55)
      }

      ctx.font = '10px monospace'
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.fillText(data.ticket_id, w / 2, h - 25)

      ctx.fillStyle = '#1e293b'
      ctx.font = '11px sans-serif'
      ctx.fillText('Present this ticket at the entrance for verification.', w / 2, h - 8)

      const a = document.createElement('a')
      a.download = 'ticket-' + data.ticket_id.slice(0, 8) + '.png'
      a.href = offscreen.toDataURL('image/png')
      a.click()
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load ticket'}</div>`
  }
})()

function formatTicketTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function wrapText(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [text]
}
