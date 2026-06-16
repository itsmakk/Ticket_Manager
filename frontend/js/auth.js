// Auth — ONLY uses Supabase Auth directly (shares client from api.js)
// Profile data queries go through Edge Functions via API.getProfile()
function getAuthSB() { return window.__apiSupabase }
const loginForm = document.getElementById('loginForm')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const alertDiv = document.getElementById('alert')
    const sb = getAuthSB()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { alertDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`; return }
    localStorage.setItem('sb-token', data.session?.access_token)
    localStorage.setItem('sb-user', JSON.stringify(data.user))
    const params = new URLSearchParams(window.location.search)
    if (params.get('redirect')) { window.location.href = params.get('redirect'); return }
    try {
      const profile = await API.getProfile()
      const roleHome = {
        admin: '/admin/index.html',
        counter: '/admin/counter.html',
        scanner: '/scanner/index.html',
      }
      window.location.href = roleHome[profile?.role] || '/'
    } catch {
      window.location.href = '/'
    }
  })
}
const registerForm = document.getElementById('registerForm')
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fullName = document.getElementById('fullName').value
    const mobile = document.getElementById('mobile').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const alertDiv = document.getElementById('alert')
    const sb = getAuthSB()
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName, mobile } } })
    if (error) { alertDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`; return }
    alertDiv.innerHTML = '<div class="alert alert-success">Registration successful! Check your email to verify.</div>'
  })
}
const forgotForm = document.getElementById('forgotForm')
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const alertDiv = document.getElementById('alert')
    const sb = getAuthSB()
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${CONFIG.SITE_URL}/login.html` })
    if (error) { alertDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>` }
    else { alertDiv.innerHTML = '<div class="alert alert-success">Reset link sent to your email.</div>' }
  })
}
// Toggle nav based on login state + attach logout handler
document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem('sb-token')
  const uRaw = localStorage.getItem('sb-user')
  const lb = document.getElementById('loginBtn'); const rb = document.getElementById('registerBtn')
  const pl = document.getElementById('profileLink'); const lo = document.getElementById('logoutBtn')
  const un = document.getElementById('userName')
  let user = null
  try { if (t && uRaw) user = JSON.parse(uRaw) } catch {}
  if (user) {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    if (lb) lb.style.display = 'none'
    if (rb) rb.style.display = 'none'
    if (pl) pl.style.display = 'inline-block'
    if (un) { un.textContent = name; un.style.display = 'inline-block' }
  } else {
    if (lb) lb.style.display = 'inline-block'
    if (rb) rb.style.display = 'inline-block'
    if (pl) pl.style.display = 'none'
    if (un) un.style.display = 'none'
  }
  // Show sidebar links based on role (hide everything first to avoid flash)
  if (t && user) {
    const sidebarLinks = document.querySelectorAll('.admin-sidebar a')
    const allowedByRole = {
      counter: new Set(['Counter Booking', 'Book Tickets', 'CSM Admin']),
      scanner: new Set(['Verify Tickets', 'Book Tickets', 'CSM Admin']),
    }
    API.getProfile().then(profile => {
      if (profile) {
        sidebarLinks.forEach(a => {
          const text = a.textContent.trim()
          if (profile.role === 'admin') {
            a.style.display = ''
          } else {
            a.style.display = allowedByRole[profile.role]?.has(text) ? '' : 'none'
          }
        })
      }
    }).catch(() => {
      sidebarLinks.forEach(a => a.style.display = 'none')
    })
    // Hide sidebar links instantly (before API responds) to prevent flash
    sidebarLinks.forEach(a => a.style.display = 'none')
  }

  // Hide Admin Panel header link for non-admin users
  if (t && user) {
    API.getProfile().then(profile => {
      if (profile) {
        const adminLink = document.getElementById('adminPanelLink')
        if (adminLink) adminLink.style.display = profile.role === 'admin' ? '' : 'none'
      }
    }).catch(() => {})
  }

  // Attach frontend logout
  if (lo) {
    lo.style.display = (t && user) ? 'inline-block' : 'none'
    lo.addEventListener('click', async (e) => {
      e.preventDefault()
      const sb = getAuthSB()
      await sb.auth.signOut()
      localStorage.removeItem('sb-token'); localStorage.removeItem('sb-user')
      window.location.href = '/'
    })
  }
  // Attach admin sidebar logout
  const alo = document.getElementById('adminLogout')
  if (alo) {
    alo.addEventListener('click', async (e) => {
      e.preventDefault()
      const sb = getAuthSB()
      await sb.auth.signOut()
      localStorage.removeItem('sb-token'); localStorage.removeItem('sb-user')
      window.location.href = '/'
    })
  }
})
