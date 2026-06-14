// Auth — ONLY uses Supabase Auth directly (shares client from api.js)
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
    window.location.href = params.get('redirect') || '/'
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
  const u = localStorage.getItem('sb-user')
  const lb = document.getElementById('loginBtn'); const rb = document.getElementById('registerBtn')
  const pl = document.getElementById('profileLink'); const lo = document.getElementById('logoutBtn')
  const un = document.getElementById('userName')
  if (t && u) {
    const user = JSON.parse(u)
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
  // Show admin user info
  const aun = document.getElementById('adminUserName')
  const aue = document.getElementById('adminUserEmail')
  const aum = document.getElementById('adminUserMobile')
  const aur = document.getElementById('adminUserRole')
  if (aun && t && u) {
    const user = JSON.parse(u)
    const email = user?.email || ''
    const meta = user?.user_metadata || {}
    const meta = user?.user_metadata || {}
    const name = meta?.full_name || email.split('@')[0] || 'User'
    aun.textContent = name
    if (aue) aue.textContent = email
    if (aum) aum.textContent = meta?.mobile ? `Mobile: ${meta.mobile}` : ''
    if (aur) {
      const sb = getAuthSB()
      if (sb) {
        sb.from('profiles').select('role, mobile, email').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            const roleDisplay = data.role.charAt(0).toUpperCase() + data.role.slice(1)
            aun.textContent = `Welcome ${roleDisplay}, ${name}`
            if (aur) aur.textContent = data.role
            if (aum && data.mobile && !meta?.mobile) aum.textContent = `Mobile: ${data.mobile}`
            // Role-based sidebar hiding
            const isAdmin = data.role === 'admin'
            const allowedForNonAdmin = new Set(['Verify Tickets', 'View Site', 'Logout', 'CSM Admin'])
            document.querySelectorAll('.admin-sidebar a').forEach(a => {
              const text = a.textContent.trim()
              if (!isAdmin && !allowedForNonAdmin.has(text)) {
                a.style.display = 'none'
              }
            })
          }
        })
      }
    }
  }

  // Attach frontend logout
  if (lo) {
    lo.style.display = (t && u) ? 'inline-block' : 'none'
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
