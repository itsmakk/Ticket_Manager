let eventsPage = 1, eventsTotal = 0, eventsLimit = 20
function showEventModal() {
  document.getElementById('eventModal').style.display = 'flex'
}
function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none'
}
async function loadEvents(page) {
  if (page !== undefined) eventsPage = page
  const t = document.getElementById('eventsBody')
  try {
    const res = await API.adminEvents('list', { page: eventsPage, limit: eventsLimit })
    const events = Array.isArray(res) ? res : (res.data || [])
    eventsTotal = Array.isArray(res) ? events.length : (res.total || 0)
    if (!events.length) {
      t.innerHTML = '<tr><td colspan="5"><div class="alert alert-info">No events found.</div></td></tr>'
      document.getElementById('eventsPagination').innerHTML = ''
      return
    }
    t.innerHTML = events.map(e => `<tr>
      <td>${e.title}</td>
      <td>${e.category||'-'}</td>
      <td><span class="badge badge-${e.status==='Published'?'success':'warning'}">${e.status||'Draft'}</span></td>
      <td>${new Date(e.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-sm btn-primary edit-event" data-id="${e.id}">Edit</button><button class="btn btn-sm btn-danger delete-event" data-id="${e.id}">Delete</button></td>
    </tr>`).join('')
    t.querySelectorAll('.edit-event').forEach(b => b.addEventListener('click', () => editEvent(b.dataset.id)))
    t.querySelectorAll('.delete-event').forEach(b => b.addEventListener('click', () => deleteEvent(b.dataset.id)))
    window.renderPagination('eventsPagination', eventsPage, eventsTotal, eventsLimit, p => loadEvents(p))
  } catch (err) { t.innerHTML = `<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}

document.getElementById('eventPosterFile')?.addEventListener('change', function() {
  const file = this.files[0]
  if (!file) return
  if (file.size > 1048576) {
    alert('File too large. Maximum size is 1MB.')
    this.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = function(e) {
    const preview = document.getElementById('eventPosterPreview')
    const img = document.getElementById('eventPosterPreviewImg')
    preview.style.display = 'block'
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
})

async function uploadPoster(file) {
  const sb = window.__apiSupabase
  if (!sb) throw new Error('Supabase client not available')
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb.storage.from('event-posters').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = sb.storage.from('event-posters').getPublicUrl(path)
  return publicUrl
}

document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const f = e.target
    const id = document.getElementById('eventId').value
    const fileInput = document.getElementById('eventPosterFile')
    let posterUrl = document.getElementById('eventPoster').value
    if (fileInput.files.length > 0) {
      posterUrl = await uploadPoster(fileInput.files[0])
    }
    const d = {
      title: document.getElementById('eventTitle').value,
      category: document.getElementById('eventCategory').value,
      description: document.getElementById('eventDescription').value,
      poster_url: posterUrl,
      trailer_url: document.getElementById('eventTrailer').value || null,
      status: document.getElementById('eventStatus').value,
    }
    if (id) d.id = id
    await API.adminEvents(id ? 'update' : 'create', d)
    loadEvents()
    f.reset()
    document.getElementById('eventId').value = ''
    document.getElementById('eventPoster').value = ''
    document.getElementById('eventPosterPreview').style.display = 'none'
    document.getElementById('eventModalTitle').textContent = 'New Event'
    closeEventModal()
  } catch (err) { alert('Error: ' + err.message) }
})
async function editEvent(id) {
  try {
    const r = await API.adminEvents('get', { id })
    if (!r) return
    document.getElementById('eventId').value = r.id
    document.getElementById('eventTitle').value = r.title
    document.getElementById('eventCategory').value = r.category
    document.getElementById('eventDescription').value = r.description
    document.getElementById('eventPoster').value = r.poster_url || ''
    if (r.poster_url) {
      const preview = document.getElementById('eventPosterPreview')
      const img = document.getElementById('eventPosterPreviewImg')
      preview.style.display = 'block'
      img.src = r.poster_url
    }
    document.getElementById('eventTrailer').value = r.trailer_url || ''
    document.getElementById('eventStatus').value = r.status
    document.getElementById('eventModalTitle').textContent = 'Edit Event'
    document.getElementById('eventModal').style.display = 'flex'
  } catch (err) { alert('Error: ' + err.message) }
}
async function deleteEvent(id) {
  if (!confirm('Delete?')) return
  try { await API.adminEvents('delete', { id }); loadEvents() } catch (err) { alert('Error: ' + err.message) }
}
document.addEventListener('DOMContentLoaded', loadEvents)
