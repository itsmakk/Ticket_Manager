// Admin Dashboard
async function loadDashboard() {
  const container = document.getElementById('dashboardContent')
  try {
    const stats = await API.adminDashboard()
    container.innerHTML = `<div class="grid grid-4">${Object.entries({ total_events:'Total Events', total_shows:'Total Shows', total_bookings:'Total Bookings', total_revenue:'Total Revenue' }).map(([k,l]) => `<div class="card"><h3>${l}</h3><p style="font-size:1.5rem;font-weight:700;">${k==='total_revenue'?'₹'+Number(stats[k]||0).toLocaleString():stats[k]||0}</p></div>`).join('')}</div>
    <div class="card" style="margin-top:1.5rem;"><h3>Recent Bookings</h3><table class="table">${((stats.recent_bookings||[]).map(b => `<tr><td>#${b.id.slice(0,8)}</td><td>₹${b.total_amount}</td><td>${b.status}</td><td>${new Date(b.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="4">No bookings</td></tr>')}</table></div>`
  } catch (err) { container.innerHTML = `<div class="alert alert-danger">${err.message}</div>` }
}
document.addEventListener('DOMContentLoaded', async () => {
  const sb = window.__apiSupabase
  if (!sb) return
  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = '/login.html?redirect=/admin/index.html'; return }
  try {
    const profile = await API.getProfile()
    if (!profile || profile.role !== 'admin') {
      const roleHome = {
        counter: '/admin/counter.html',
        scanner: '/scanner/index.html',
      }
      window.location.href = roleHome[profile?.role] || '/'
      return
    }
  } catch {
    window.location.href = '/login.html?redirect=/admin/index.html'
    return
  }

  document.getElementById('adminLogout')?.addEventListener('click', async (e) => {
    e.preventDefault()
    await sb.auth.signOut()
    localStorage.removeItem('sb-token'); localStorage.removeItem('sb-user')
    window.location.href = '/'
  })
  loadDashboard()
})
