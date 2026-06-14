let lastResult = null
async function verifyTicket() {
  const input = document.getElementById('ticketId').value.trim()
  const rDiv = document.getElementById('verifyResult')
  if (!input) return
  try {
    if (input.length === 36) {
      const t = await API.getTicket(input)
      lastResult = t
      rDiv.innerHTML = `<div class="card"><p><strong>Ticket:</strong> ${t.ticket_id}</p><p><strong>Event:</strong> ${t.event_title}</p><p><strong>Date:</strong> ${t.show_date} ${t.show_time}</p><p><strong>Seats:</strong> ${t.seats||'-'}</p><p><strong>Status:</strong> <span class="badge badge-${t.status==='Valid'?'success':'warning'}">${t.status}</span></p></div>`
    } else {
      const v = await API.verifyTicket(input)
      lastResult = v
      rDiv.innerHTML = `<div class="card"><p><strong>Valid:</strong> ${v.valid?'Yes':'No'}</p></div>`
    }
  } catch(err) { rDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}
document.addEventListener('DOMContentLoaded', () => {})
