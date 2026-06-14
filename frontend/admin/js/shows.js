function showShowModal() {
  const sel = document.getElementById('showEventId')
  API.adminEvents('list').then(events => {
    sel.innerHTML = '<option value="">Select Event</option>' + (events||[]).map(e => `<option value="${e.id}">${e.title}</option>`).join('')
  })
  document.getElementById('showModalTitle').textContent = 'New Show'
  document.getElementById('showId').value = ''
  document.getElementById('showForm').reset()
  document.getElementById('showModal').style.display = 'flex'
}
function closeShowModal() {
  document.getElementById('showModal').style.display = 'none'
}
async function loadShows() {
  try {
    const sel = document.getElementById('eventFilter')
    const events = await API.adminEvents('list')
    sel.innerHTML = '<option value="">All Events</option>'+(events||[]).map(e=>`<option value="${e.id}">${e.title}</option>`).join('')
    filterShows()
  } catch(err) { console.error(err) }
}
async function filterShows() {
  const t = document.getElementById('showsTable'); const eid = document.getElementById('eventFilter').value
  try {
    const evts = await API.adminEvents('list')
    let shows = []; for(const e of (evts||[]).filter(x=>!eid||x.id===eid)) { const s = await API.getShows(e.id); (s||[]).forEach(x=>x.event_title=e.title); shows=shows.concat(s||[]) }
    t.innerHTML = shows.map(s => `<tr><td>${s.event_title||'-'}</td><td>${s.show_date}</td><td>${s.start_time}</td><td>₹${s.price_premium}</td><td>₹${s.price_gold}</td><td>₹${s.price_silver}</td><td><span class="badge badge-${s.status==='Active'?'success':'warning'}">${s.status}</span></td>
      <td><button class="btn btn-sm btn-primary" onclick="editShow('${s.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteShow('${s.id}')">Delete</button></td></tr>`).join('')
  } catch(err) { t.innerHTML=`<tr><td colspan="8"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('showForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = document.getElementById('showId').value
  const d = {
    event_id: document.getElementById('showEventId').value,
    show_date: document.getElementById('showDate').value,
    start_time: document.getElementById('showTime').value,
    price_premium: parseFloat(document.getElementById('pricePremium').value),
    price_gold: parseFloat(document.getElementById('priceGold').value),
    price_silver: parseFloat(document.getElementById('priceSilver').value),
    status: document.getElementById('showStatus').value,
  }
  if (!d.event_id) return alert('Select an event')
  if (id) d.id = id
  await API.adminShows(id ? 'update' : 'create', d)
  filterShows()
  e.target.reset()
  document.getElementById('showId').value = ''
  closeShowModal()
})
async function editShow(id) {
  const events = await API.adminEvents('list')
  for (const e of events) {
    const s = await API.getShows(e.id)
    const r = (s||[]).find(x => x.id === id)
    if (r) {
      document.getElementById('showId').value = r.id
      document.getElementById('showEventId').value = r.event_id
      document.getElementById('showDate').value = r.show_date
      document.getElementById('showTime').value = r.start_time
      document.getElementById('pricePremium').value = r.price_premium
      document.getElementById('priceGold').value = r.price_gold
      document.getElementById('priceSilver').value = r.price_silver
      document.getElementById('showStatus').value = r.status
      document.getElementById('showModalTitle').textContent = 'Edit Show'
      document.getElementById('showModal').style.display = 'flex'
      break
    }
  }
}
async function deleteShow(id) { if(!confirm('Delete?'))return; await API.adminShows('delete',{id}); filterShows() }
document.addEventListener('DOMContentLoaded', loadShows)
