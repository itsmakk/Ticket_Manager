// Auth — ONLY uses Supabase Auth directly
function getAuthSB() {
  return window.__apiSupabase || window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
}
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
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault()
  const sb = getAuthSB()
  await sb.auth.signOut()
  localStorage.removeItem('sb-token'); localStorage.removeItem('sb-user')
  window.location.href = '/'
})
