// Auth module - handles login, register, forgot password
let supabaseClient;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const alertDiv = document.getElementById('alert');

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alertDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      return;
    }

    // Store session info
    localStorage.setItem('sb-token', data.session?.access_token);
    localStorage.setItem('sb-user', JSON.stringify(data.user));

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/';
    window.location.href = redirect;
  });
}

// Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const mobile = document.getElementById('mobile').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const alertDiv = document.getElementById('alert');

    const supabase = getSupabase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, mobile: mobile } }
    });

    if (authError) {
      alertDiv.innerHTML = `<div class="alert alert-danger">${authError.message}</div>`;
      return;
    }

    // Create profile
    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: fullName,
        mobile: mobile,
        email: email,
        role: 'user',
      });

      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'User Registration',
        module: 'Auth',
        details: `New user registered: ${email}`,
      });
    }

    alertDiv.innerHTML = `<div class="alert alert-success">Registration successful! Please check your email to verify your account.</div>`;
  });
}

// Forgot Password
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const alertDiv = document.getElementById('alert');

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${CONFIG.SITE_URL}/login.html`,
    });

    if (error) {
      alertDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    } else {
      alertDiv.innerHTML = `<div class="alert alert-success">Password reset link sent to your email.</div>`;
    }
  });
}

// Logout button (on any page)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    await supabase.auth.signOut();
    localStorage.removeItem('sb-token');
    localStorage.removeItem('sb-user');
    window.location.href = '/';
  });
}
