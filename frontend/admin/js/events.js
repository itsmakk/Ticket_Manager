function showEventModal() {
  document.getElementById('eventModal').style.display = 'flex'
}
function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none'
}
async function loadEvents() {
  const t = document.getElementById('eventsTable')
  try {
    const events = await API.adminEvents('list')
    t.innerHTML = (events||[]).map(e => `<tr><td>${e.title}</td><td>${e.category||'-'}</td><td><span class="badge badge-${e.status==='Active'?'success':'warning'}">${e.status||'Draft'}</span></td><td>${new Date(e.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-sm btn-primary" onclick="editEvent('${e.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">Delete</button></td></tr>`).join('')
  } catch (err) { t.innerHTML = `<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = e.target
  const id = document.getElementById('eventId').value
  const d = {
    title: document.getElementById('eventTitle').value,
    category: document.getElementById('eventCategory').value,
    description: document.getElementById('eventDescription').value,
    poster_url: document.getElementById('eventPoster').value,
    status: document.getElementById('eventStatus').value,
  }
  if (id) d.id = id
  await API.adminEvents(id ? 'update' : 'create', d)
  loadEvents()
  f.reset()
  document.getElementById('eventId').value = ''
  document.getElementById('eventModalTitle').textContent = 'New Event'
  closeEventModal()
})
async function editEvent(id) {
  const r = await API.adminEvents('get', { id })
  if (!r) return
  document.getElementById('eventId').value = r.id
  document.getElementById('eventTitle').value = r.title
  document.getElementById('eventCategory').value = r.category
  document.getElementById('eventDescription').value = r.description
  document.getElementById('eventPoster').value = r.poster_url || ''
  document.getElementById('eventStatus').value = r.status
  document.getElementById('eventModalTitle').textContent = 'Edit Event'
  document.getElementById('eventModal').style.display = 'flex'
}
async function deleteEvent(id) { if (!confirm('Delete?')) return; await API.adminEvents('delete', { id }); loadEvents() }
document.addEventListener('DOMContentLoaded', loadEvents)
