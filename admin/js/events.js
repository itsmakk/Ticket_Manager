const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

async function loadEvents() {
  const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  document.getElementById('eventsBody').innerHTML = data?.length
    ? data.map(e => `<tr>
      <td>${e.title}</td>
      <td>${e.category || '-'}</td>
      <td><span class="badge badge-${e.status === 'Published' ? 'success' : e.status === 'Draft' ? 'warning' : 'danger'}">${e.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editEvent('${e.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">Archive</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--gray-500);">No events found.</td></tr>';
}

async function editEvent(id) {
  const { data } = await supabase.from('events').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('eventId').value = id;
  document.getElementById('eventTitle').value = data.title;
  document.getElementById('eventCategory').value = data.category || 'Movie';
  document.getElementById('eventDescription').value = data.description || '';
  document.getElementById('eventPoster').value = data.poster_url || '';
  document.getElementById('eventStatus').value = data.status || 'Draft';
  document.getElementById('eventModalTitle').textContent = 'Edit Event';
  document.getElementById('eventModal').style.display = 'flex';
}

function showEventModal() {
  document.getElementById('eventForm').reset();
  document.getElementById('eventId').value = '';
  document.getElementById('eventModalTitle').textContent = 'New Event';
  document.getElementById('eventModal').style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none';
}

document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('eventId').value;
  const data = {
    title: document.getElementById('eventTitle').value,
    category: document.getElementById('eventCategory').value,
    description: document.getElementById('eventDescription').value,
    poster_url: document.getElementById('eventPoster').value,
    status: document.getElementById('eventStatus').value,
  };
  if (id) {
    await supabase.from('events').update(data).eq('id', id);
  } else {
    await supabase.from('events').insert(data);
  }
  closeEventModal();
  loadEvents();
});

async function deleteEvent(id) {
  if (!confirm('Archive this event?')) return;
  await supabase.from('events').update({ status: 'Archived' }).eq('id', id);
  loadEvents();
}

checkAdmin();
loadEvents();
