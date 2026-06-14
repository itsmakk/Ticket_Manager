const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

async function loadEvents() {
  const { data } = await supabase.from('events').select('id, title').eq('status', 'Published');
  const sel = document.getElementById('showEventId');
  sel.innerHTML = '<option value="">Select Event</option>' +
    (data?.map(e => `<option value="${e.id}">${e.title}</option>`).join('') || '');
}

async function loadShows() {
  const { data } = await supabase
    .from('shows')
    .select('*, events(title)')
    .order('show_date', { ascending: false });

  document.getElementById('showsBody').innerHTML = data?.length
    ? data.map(s => `<tr>
      <td>${s.events?.title || '-'}</td>
      <td>${s.show_date}</td>
      <td>${s.start_time}</td>
      <td><span class="badge badge-${s.status === 'Active' ? 'success' : s.status === 'Upcoming' ? 'primary' : s.status === 'Completed' ? 'secondary' : 'danger'}">${s.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editShow('${s.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="cancelShow('${s.id}')">Cancel</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--gray-500);">No shows found.</td></tr>';
}

async function editShow(id) {
  const { data } = await supabase.from('shows').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('showId').value = id;
  document.getElementById('showEventId').value = data.event_id;
  document.getElementById('showDate').value = data.show_date;
  document.getElementById('showTime').value = data.start_time;
  document.getElementById('showDuration').value = data.duration || 120;
  document.getElementById('pricePremium').value = data.price_premium || 300;
  document.getElementById('priceGold').value = data.price_gold || 250;
  document.getElementById('priceSilver').value = data.price_silver || 200;
  document.getElementById('showStatus').value = data.status || 'Upcoming';
  document.getElementById('showModalTitle').textContent = 'Edit Show';
  document.getElementById('showModal').style.display = 'flex';
}

function showShowModal() {
  document.getElementById('showForm').reset();
  document.getElementById('showId').value = '';
  document.getElementById('showModalTitle').textContent = 'New Show';
  document.getElementById('showModal').style.display = 'flex';
}

function closeShowModal() {
  document.getElementById('showModal').style.display = 'none';
}

document.getElementById('showForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('showId').value;
  const data = {
    event_id: document.getElementById('showEventId').value,
    show_date: document.getElementById('showDate').value,
    start_time: document.getElementById('showTime').value,
    duration: parseInt(document.getElementById('showDuration').value),
    end_time: document.getElementById('showTime').value,
    price_premium: parseFloat(document.getElementById('pricePremium').value),
    price_gold: parseFloat(document.getElementById('priceGold').value),
    price_silver: parseFloat(document.getElementById('priceSilver').value),
    status: document.getElementById('showStatus').value,
  };
  if (id) {
    await supabase.from('shows').update(data).eq('id', id);
  } else {
    await supabase.from('shows').insert(data);
  }
  closeShowModal();
  loadShows();
});

async function cancelShow(id) {
  if (!confirm('Cancel this show?')) return;
  await supabase.from('shows').update({ status: 'Cancelled' }).eq('id', id);
  loadShows();
}

checkAdmin();
loadEvents();
loadShows();
