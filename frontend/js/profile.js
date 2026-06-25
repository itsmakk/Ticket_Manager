let profile = null

async function loadProfile() {
  try {
    profile = await API.getProfile()
    document.getElementById('dispName').textContent = profile.full_name || '-'
    document.getElementById('dispEmail').textContent = profile.email || '-'
    document.getElementById('dispMobile').textContent = profile.mobile || '-'
    document.getElementById('dispRole').textContent = profile.role || '-'
    document.getElementById('editName').value = profile.full_name || ''
    document.getElementById('editEmail').value = profile.email || ''
    document.getElementById('editMobile').value = profile.mobile || ''
  } catch (err) {
    document.getElementById('profileAlert').innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
}

function showEditForm() {
  document.getElementById('profileDisplay').style.display = 'none'
  document.getElementById('profileEditForm').style.display = 'block'
}

function cancelEdit() {
  document.getElementById('profileDisplay').style.display = 'block'
  document.getElementById('profileEditForm').style.display = 'none'
  document.getElementById('editName').value = profile.full_name || ''
  document.getElementById('editEmail').value = profile.email || ''
  document.getElementById('editMobile').value = profile.mobile || ''
}

document.getElementById('profileEditForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('editName').value.trim()
  const email = document.getElementById('editEmail').value.trim()
  const mobile = document.getElementById('editMobile').value.trim()
  const alertDiv = document.getElementById('profileAlert')
  try {
    await API.updateProfile({
      full_name: name,
      email: email || undefined,
      mobile: mobile || undefined,
    })
    const sb = getSB()
    const authUpdates = {}
    if (name && name !== profile.full_name) authUpdates.data = { ...authUpdates.data, full_name: name }
    if (mobile && mobile !== profile.mobile) authUpdates.data = { ...authUpdates.data, mobile }
    if (email && email !== profile.email) authUpdates.email = email
    if (Object.keys(authUpdates).length) {
      const { data: authData, error } = await sb.auth.updateUser(authUpdates)
      if (error) throw error
      if (authData?.user) localStorage.setItem('sb-user', JSON.stringify(authData.user))
    }
    alertDiv.innerHTML = '<div class="alert alert-success">Profile updated successfully!</div>'
    cancelEdit()
    await loadProfile()
  } catch (err) {
    alertDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
})

async function changePassword() {
  const input = document.getElementById('newPassword')
  const pr = document.getElementById('passwordResult')
  const pw = input.value.trim()
  if (pw.length < 6) { pr.innerHTML = '<p style="color:var(--danger);font-size:0.9rem;">Password must be at least 6 characters.</p>'; return }
  try {
    const sb = getSB()
    const { error } = await sb.auth.updateUser({ password: pw })
    if (error) throw error
    input.value = ''
    pr.innerHTML = '<p style="color:var(--success);font-size:0.9rem;">Password updated successfully!</p>'
  } catch (err) {
    pr.innerHTML = `<p style="color:var(--danger);font-size:0.9rem;">${err.message}</p>`
  }
}

async function loadBookings() {
  const container = document.getElementById('bookingsList')
  try {
    const bookings = await API.getBookings()
    if (!bookings?.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem 0;"><p style="color:var(--text-secondary);margin-bottom:1rem;">No bookings yet.</p><a href="/events.html" class="btn btn-primary">Browse Events</a></div>'; return
    }
    container.innerHTML = bookings.map(b => `<div style="padding:0.75rem 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:0.5rem;">
        <div>
          <strong>${b.events?.title||'Event'}</strong>
          <p style="font-size:0.85rem;color:var(--text-secondary);">${b.shows?.show_date} ${b.shows?.start_time}</p>
          <p style="font-size:0.85rem;">₹${b.total_amount} <span class="badge badge-${b.status==='Confirmed'?'success':'danger'}">${b.status}</span></p>
        </div>
        <div style="text-align:right;">${(b.tickets||[]).map(t => `<button class="btn btn-sm btn-outline" style="margin-bottom:0.25rem;" onclick="showQR('${t.ticket_id}','${t.verification_token}','${b.events?.title}','${b.shows?.show_date}','${b.shows?.start_time}','${t.seat?.seat_number||'-'}')">${t.seat ? 'Ticket '+t.seat.seat_number : 'View'}</button>`).join('')||'<span style="font-size:0.85rem;color:var(--text-secondary);">No tickets</span>'}</div>
      </div>
    </div>`).join('')
  } catch (err) { container.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}

function showQR(tid, tok, ev, dt, tm, seats) {
  const d = JSON.stringify({ticket_id:tid, token:tok.slice(0,20)})
  const m = document.createElement('div'); m.className='modal-overlay'
  m.innerHTML = `<div class="modal" style="text-align:center;"><div class="modal-header"><h2>Your Ticket</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
    <div style="padding:1rem 0;"><p><strong>${ev}</strong></p><p style="color:var(--text-secondary);font-size:0.9rem;">${dt} | ${tm}</p><p style="color:var(--text-secondary);font-size:0.9rem;">${seats}</p>
    <canvas id="qr-${tid}" style="margin:1rem auto;"></canvas><p style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary);">${tid}</p>
    <button class="btn btn-primary" onclick="dl('${tid}')">Download</button></div></div>`
  document.body.appendChild(m)
  QRCode.toCanvas(document.getElementById('qr-'+tid), JSON.stringify(d), {width:200,margin:2})
}
function dl(tid) { const c=document.getElementById('qr-'+tid); if(!c)return; const a=document.createElement('a'); a.download='ticket-'+tid+'.png'; a.href=c.toDataURL('image/png'); a.click() }

document.addEventListener('DOMContentLoaded', () => {
  loadProfile()
  loadBookings()
})
