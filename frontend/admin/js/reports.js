async function loadReports() {
  const container = document.getElementById('reportsContent')
  try {
    const r = await API.adminReports()
    container.innerHTML = `<div class="grid grid-3">${Object.entries({ total_revenue:'Revenue', total_bookings:'Bookings', avg_booking_value:'Avg/Booking', total_tickets:'Tickets', cancelled_bookings:'Cancelled', used_promos:'Promos Used'}).map(([k,l])=><div class="card"><h3>${l}</h3><p style="font-size:1.5rem;font-weight:700;">${k==='total_revenue'?'₹'+Number(r[k]||0).toLocaleString():r[k]||0}</p></div>).join('')}</div>
    <div class="card" style="margin-top:1.5rem;"><h3>Revenue by Event</h3><table class="table"><tr><th>Event</th><th>Revenue</th><th>Bookings</th></tr>${((r.revenue_by_event||[]).map(e => `<tr><td>${e.title||'Unknown'}</td><td>₹${Number(e.revenue||0).toLocaleString()}</td><td>${e.count||0}</td></tr>`).join('')||'<tr><td colspan="3">No data</td></tr>')}</table></div>`
  } catch(err) { container.innerHTML=`<div class="alert alert-danger">${err.message}</div>` }
}
document.addEventListener('DOMContentLoaded', loadReports)
