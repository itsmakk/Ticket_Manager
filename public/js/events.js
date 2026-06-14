// Public events listing
let supabaseClient;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

async function loadEvents() {
  const supabase = getSupabase();
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  if (!events?.length) {
    grid.innerHTML = '<div class="card" style="text-align:center;padding:3rem;grid-column:1/-1;"><p style="color:var(--gray-500);">No events available at the moment. Check back later!</p></div>';
    return;
  }

  grid.innerHTML = events.map(e => `
    <a href="/event-detail.html?id=${e.id}" class="event-card" style="text-decoration:none;color:inherit;">
      ${e.poster_url ? `<img class="event-card-img" src="${e.poster_url}" alt="${e.title}" />` : '<div style="height:200px;background:var(--gray-200);display:flex;align-items:center;justify-content:center;color:var(--gray-500);">No Image</div>'}
      <div class="event-card-body">
        <h3 class="event-card-title">${e.title}</h3>
        <p class="event-card-meta">${e.category || 'Event'}</p>
        <p style="font-size:0.85rem;color:var(--gray-500);">${e.description?.slice(0,100) || ''}${(e.description?.length || 0) > 100 ? '...' : ''}</p>
      </div>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  const token = localStorage.getItem('sb-token');
  if (token) {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    const profileLink = document.getElementById('profileLink');
    if (profileLink) profileLink.style.display = 'inline-block';
  }
});
