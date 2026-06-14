// Admin Core - shared utilities and auth check

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Auth check
async function checkAdminAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html?redirect=/admin/index.html';
    return null;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (!profile || profile.role !== 'admin') {
    document.body.innerHTML = '<div style="text-align:center;padding:4rem;"><h1>Access Denied</h1><p>Admin access required.</p><a href="/" class="btn btn-primary">Go Home</a></div>';
    return null;
  }
  return session;
}

// Logout
document.getElementById('adminLogout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  window.location.href = '/login.html';
});

// Load dashboard stats
async function loadDashboard() {
  const session = await checkAdminAuth();
  if (!session) return;

  const today = new Date().toISOString().split('T')[0];

  const [totalEvents, totalShows, totalBookings, todayBookings, todayRevenue] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('shows').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('bookings').select('total_amount').eq('status', 'Confirmed'),
  ]);

  const totalRevenue = todayRevenue.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="number">${totalEvents.count || 0}</div><div class="label">Total Events</div></div>
    <div class="stat-card"><div class="number">${totalShows.count || 0}</div><div class="label">Total Shows</div></div>
    <div class="stat-card"><div class="number">${totalBookings.count || 0}</div><div class="label">Total Bookings</div></div>
    <div class="stat-card"><div class="number">₹${totalRevenue.toLocaleString()}</div><div class="label">Total Revenue</div></div>
    <div class="stat-card"><div class="number">${todayBookings.count || 0}</div><div class="label">Today's Bookings</div></div>
  `;

  // Recent bookings
  const { data: recent } = await supabase
    .from('bookings')
    .select('*, events(title), shows(start_time, show_date)')
    .order('created_at', { ascending: false })
    .limit(10);

  document.getElementById('recentBookings').innerHTML = recent?.length
    ? `<div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Event</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${recent.map(b => `<tr><td>${b.id.slice(0,8)}</td><td>${b.events?.title || '-'}</td><td>₹${b.total_amount}</td><td><span class="badge badge-${b.status === 'Confirmed' ? 'success' : 'danger'}">${b.status}</span></td></tr>`).join('')}
      </tbody></table></div>`
    : '<p style="color:var(--gray-500);">No bookings yet.</p>';

  // Upcoming shows
  const { data: upcoming } = await supabase
    .from('shows')
    .select('*, events(title)')
    .in('status', ['Upcoming', 'Active'])
    .order('show_date', { ascending: true })
    .limit(10);

  document.getElementById('upcomingShows').innerHTML = upcoming?.length
    ? `<div class="table-wrap"><table>
      <thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
      <tbody>${upcoming.map(s => `<tr><td>${s.events?.title || '-'}</td><td>${s.show_date}</td><td>${s.start_time}</td><td><span class="badge badge-${s.status === 'Active' ? 'success' : 'primary'}">${s.status}</span></td></tr>`).join('')}
      </tbody></table></div>`
    : '<p style="color:var(--gray-500);">No upcoming shows.</p>';
}

// Utility: show alert
function showAlert(msg, type = 'danger') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = msg;
  return div;
}

// Admin sidebar is loaded via iframe or we can inject it from a template
// For simplicity, we use the inline sidebar in each page

document.addEventListener('DOMContentLoaded', async () => {
  // Check if we're on dashboard
  if (document.getElementById('statsGrid')) {
    await loadDashboard();
  }
  // Update sidebar active link
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.admin-sidebar a').forEach(a => {
    if (a.getAttribute('href')?.includes(currentPage)) {
      a.style.background = 'rgba(255,255,255,0.15)';
      a.style.color = 'white';
    }
  });
});
