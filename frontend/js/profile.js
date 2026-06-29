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

const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)
function notify(msg, type) { if (window.UI) UI.toast(msg, type) }

document.getElementById('profileEditForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('editName').value.trim()
  const email = document.getElementById('editEmail').value.trim()
  const mobile = document.getElementById('editMobile').value.trim()
  const alertDiv = document.getElementById('profileAlert')
  const btn = e.target.querySelector('button[type="submit"]')
  if (mobile && !/^[0-9]{10}$/.test(mobile)) {
    if (window.UI) UI.showAlert(alertDiv, 'Mobile must be a 10-digit number.', 'danger'); notify('Mobile must be 10 digits.', 'error'); return
  }
  if (window.UI) UI.setBtnLoading(btn, true, 'Saving…')
  try {
    await API.updateProfile({ full_name: name, email: email || undefined, mobile: mobile || undefined })
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
    if (window.UI) UI.showAlert(alertDiv, 'Profile updated successfully!', 'success')
    else alertDiv.innerHTML = '<div class="alert alert-success">Profile updated successfully!</div>'
    notify('Profile updated', 'success')
    cancelEdit()
    await loadProfile()
  } catch (err) {
    if (window.UI) UI.showAlert(alertDiv, err.message, 'danger'); else alertDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`
    notify(err.message, 'error')
  } finally {
    if (window.UI) UI.setBtnLoading(btn, false)
  }
})

async function changePassword() {
  const input = document.getElementById('newPassword')
  const pr = document.getElementById('passwordResult')
  const btn = document.getElementById('changePwBtn')
  const pw = input.value.trim()
  if (pw.length < 6) { pr.innerHTML = '<p class="field-error">Password must be at least 6 characters.</p>'; return }
  if (window.UI) UI.setBtnLoading(btn, true, 'Updating…')
  try {
    const sb = getSB()
    const { error } = await sb.auth.updateUser({ password: pw })
    if (error) throw error
    input.value = ''
    pr.innerHTML = '<p style="color:var(--success);font-size:0.9rem;">Password updated successfully!</p>'
    notify('Password updated', 'success')
  } catch (err) {
    pr.innerHTML = `<p class="field-error">${esc(err.message)}</p>`
    notify(err.message, 'error')
  } finally {
    if (window.UI) UI.setBtnLoading(btn, false)
  }
}

async function loadBookings() {
  const container = document.getElementById('bookingsList')
  try {
    const bookings = await API.getBookings()
    if (!bookings?.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎟️</div><div class="empty-state-title">No bookings yet</div><p>Your booked tickets will appear here.</p><a href="/events.html" class="btn btn-primary">Browse Events</a></div>'; return
    }
    container.innerHTML = bookings.map(b => `<div class="booking-item">
      <div class="booking-item-info">
        <strong>${esc(b.events?.title || 'Event')}</strong>
        <p class="text-muted" style="font-size:0.85rem;">${esc(b.shows?.show_date || '')} ${esc(b.shows?.start_time || '')}</p>
        <p style="font-size:0.85rem;">₹${esc(b.total_amount)} <span class="badge badge-${b.status === 'Confirmed' ? 'success' : 'danger'}">${esc(b.status)}</span></p>
      </div>
      <div class="booking-item-actions">${(b.tickets || []).map(t => `<a href="/ticket.html?ticket_id=${esc(t.ticket_id)}" class="btn btn-sm btn-outline">${t.seat ? 'Seat ' + esc(t.seat.seat_number) : 'View'}</a>`).join('') || '<span class="text-muted" style="font-size:0.85rem;">No tickets</span>'}</div>
    </div>`).join('')
  } catch (err) { container.innerHTML = `<div class="alert alert-danger" role="alert">${esc(err.message)}</div>` }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile()
  loadBookings()
})
