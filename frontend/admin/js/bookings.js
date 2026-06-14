async function loadBookings() {
  const t = document.getElementById('bookingsTable')
  try {
    const bookings = await API.adminBookings('list')
    t.innerHTML = (bookings||[]).map(b => `<tr><td>#${b.id.slice(0,8)}</td><td>${b.user_email||'-'}</td><td>${b.event_title||'-'}</td><td>${b.show_date||'-'} ${b.show_time||'-'}</td>
      <td>₹${b.total_amount}</td><td><span class="badge badge-${b.status==='Confirmed'?'success':b.status==='Cancelled'?'danger':'warning'}">${b.status}</span></td>
      <td><button class="btn btn-sm btn-${b.status==='Confirmed'?'danger':'secondary'}" onclick="cancelBooking('${b.id}')">${b.status==='Cancelled'?'N/A':'Cancel'}</button></td></tr>`).join('')
  } catch(err) { t.innerHTML=`<tr><td colspan="7"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
async function cancelBooking(id) { if(!confirm('Cancel booking?'))return; await API.adminBookings('cancel',{id}); loadBookings() }
document.addEventListener('DOMContentLoaded', loadBookings)
