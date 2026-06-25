let bookingsPage = 1, bookingsTotal = 0, bookingsLimit = 20

async function loadBookings(page) {
  const t = document.getElementById('bookingsBody')
  if (page != null) bookingsPage = page
  try {
    const res = await API.adminBookings('list', { page: bookingsPage, limit: bookingsLimit })
    const bookings = Array.isArray(res) ? res : (res.data || [])
    bookingsTotal = Array.isArray(res) ? bookings.length : (res.total || 0)
    if (!bookings.length) {
      t.innerHTML = '<tr><td colspan="7"><div class="alert alert-info">No bookings found.</div></td></tr>'
      document.getElementById('bookingsPagination').innerHTML = ''
      return
    }
    t.innerHTML = bookings.map(b => `<tr><td>#${b.id.slice(0,8)}</td><td>${b.customer_name || b.user_email||'-'}</td><td>${b.events?.title||'-'}</td><td>${b.shows?.show_date||'-'} ${b.shows?.start_time||'-'}</td>
      <td>₹${b.total_amount}</td><td><span class="badge badge-${b.status==='Confirmed'?'success':b.status==='Cancelled'?'danger':'warning'}">${b.status}</span></td>
      <td>${b.status==='Confirmed'?`<button class="btn btn-sm btn-danger cancel-booking" data-id="${b.id}">Cancel</button>`:'<span style="color:var(--text-secondary);font-size:0.85rem;">-</span>'}</td></tr>`).join('')
    t.querySelectorAll('.cancel-booking').forEach(el => el.addEventListener('click', () => showCancelModal(el.dataset.id)))
    window.renderPagination('bookingsPagination', bookingsPage, bookingsTotal, bookingsLimit, p => loadBookings(p))
  } catch(err) { t.innerHTML=`<tr><td colspan="7"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}

function showCancelModal(id) {
  document.getElementById('cancelBookingId').value = id
  document.getElementById('cancelReason').value = ''
  document.getElementById('cancelResult').innerHTML = ''
  document.getElementById('cancelError').textContent = ''
  document.getElementById('cancelModal').style.display = 'flex'
}

function closeCancelModal() {
  document.getElementById('cancelModal').style.display = 'none'
}

async function confirmCancellation() {
  const id = document.getElementById('cancelBookingId').value
  const reason = document.getElementById('cancelReason').value.trim()
  const btn = document.getElementById('confirmCancelBtn')
  const resultDiv = document.getElementById('cancelResult')
  const errorDiv = document.getElementById('cancelError')
  btn.disabled = true; btn.textContent = 'Cancelling...'
  errorDiv.textContent = ''
  try {
    const r = await API.adminBookings('cancel', { id, reason: reason || undefined })
    resultDiv.innerHTML = `<p style="color:var(--success);">Booking cancelled successfully.${r.refunded ? ' Payment refunded.' : ''}</p>`
    setTimeout(() => { closeCancelModal(); loadBookings() }, 1500)
  } catch (err) {
    errorDiv.textContent = err.message
    btn.disabled = false; btn.textContent = 'Confirm Cancellation'
  }
}

document.getElementById('cancelForm')?.addEventListener('submit', (e) => { e.preventDefault(); confirmCancellation() })
document.addEventListener('DOMContentLoaded', loadBookings)
