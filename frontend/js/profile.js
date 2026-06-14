// Profile — ALL data through API
async function loadBookings() {
  const sb = window.__apiSupabase || window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  let { data: { session } } = await sb.auth.getSession()
  if (!session) {
    const token = localStorage.getItem('sb-token')
    if (token) {
      const { data } = await sb.auth.setSession({ access_token: token, refresh_token: token })
      session = data?.session
    }
  }
  if (!session) { location.href = '/login.html?redirect=/profile.html'; return }
  const container = document.getElementById('bookingsList')
  try {
    const bookings = await API.getBookings()
    if (!bookings?.length) {
      container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;"><h3>No Bookings</h3><p style="color:var(--gray-500);"><a href="/events.html" class="btn btn-primary">Browse Events</a></p></div>'; return
    }
    container.innerHTML = bookings.map(b => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:1rem;">
      <div><h3>${b.events?.title||'Event'}</h3><p style="color:var(--gray-500);font-size:0.9rem;">${b.shows?.show_date} ${b.shows?.start_time}</p>
        <p style="font-size:0.9rem;"><strong>Seats:</strong> ${(b.booking_seats||[]).map(s=>s.seat_number).join(', ')||'-'}</p>
        <p style="font-size:0.9rem;"><strong>Amount:</strong> ₹${b.total_amount}</p>
        <p><span class="badge badge-${b.status==='Confirmed'?'success':'danger'}">${b.status}</span> <span class="badge badge-primary">${b.booking_source}</span></p></div>
      <div style="text-align:right;">${(b.tickets||[]).map(t => `<div style="margin-bottom:0.5rem;"><button class="btn btn-sm btn-outline" onclick="showQR('${t.ticket_id}','${t.verification_token}','${b.events?.title}','${b.shows?.show_date}','${b.shows?.start_time}','${(b.booking_seats||[]).map(s=>s.seat_number).join(',')}')">View Ticket</button><span class="badge badge-${t.status==='Valid'?'success':'warning'}">${t.status}</span></div>`).join('')||'<span style="color:var(--gray-500);font-size:0.85rem;">No ticket</span>'}</div>
    </div></div>`).join('')
  } catch (err) { container.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

function showQR(tid, tok, ev, dt, tm, seats) {
  const d = JSON.stringify({ticket_id:tid, token:tok.slice(0,20)})
  const m = document.createElement('div'); m.className='modal-overlay'
  m.innerHTML = `<div class="modal" style="text-align:center;"><div class="modal-header"><h2>Your Ticket</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
    <div style="padding:1rem 0;"><p><strong>${ev}</strong></p><p style="color:var(--gray-500);font-size:0.9rem;">${dt} | ${tm}</p><p style="color:var(--gray-500);font-size:0.9rem;">${seats}</p>
    <div id="qr-${tid}" style="margin:1rem auto;width:200px;height:200px;"></div><p style="font-family:monospace;font-size:0.8rem;color:var(--gray-500);">${tid}</p>
    <button class="btn btn-primary" onclick="dl('${tid}')">Download</button></div></div>`
  document.body.appendChild(m)
  QRCode.toCanvas(document.getElementById('qr-'+tid), JSON.stringify(d), {width:200,margin:2})
}
function dl(tid) { const c=document.querySelector('#qr-'+tid+' canvas'); if(!c)return; const a=document.createElement('a'); a.download='ticket-'+tid+'.png'; a.href=c.toDataURL('image/png'); a.click() }

document.addEventListener('DOMContentLoaded', async () => {
  const sb = window.__apiSupabase || window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  let { data: { session } } = await sb.auth.getSession()
  if (!session) {
    const token = localStorage.getItem('sb-token')
    if (token) {
      const { data } = await sb.auth.setSession({ access_token: token, refresh_token: token })
      session = data?.session
    }
  }
  if (!session) { location.href = '/login.html?redirect=/profile.html'; return }
  loadBookings()
})
