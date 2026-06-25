let showsPage = 1, showsTotal = 0, showsLimit = 20, eventFilterPopulated = false
function showShowModal() {
  document.getElementById('showModalTitle').textContent = 'New Show'
  document.getElementById('showId').value = ''
  document.getElementById('showForm').reset()
  document.getElementById('showModal').style.display = 'flex'
  populateEventDropdown('showEventId').catch(() => {})
}
function closeShowModal() {
  document.getElementById('showModal').style.display = 'none'
}

async function populateEventDropdown(selectId, selectedId) {
  const sel = document.getElementById(selectId)
  if (!sel) return
  const events = await API.adminEvents('list', { page: 1, limit: 1000 })
  sel.innerHTML = '<option value="">Select Event</option>' + (events?.data || events || []).map(e => `<option value="${e.id}">${e.title}</option>`).join('')
  if (selectedId) sel.value = selectedId
}

async function loadShows(page) {
  if (page !== undefined) showsPage = page
  try {
    if (!eventFilterPopulated) {
      await populateEventDropdown('eventFilter')
      eventFilterPopulated = true
    }
    const filterEventId = document.getElementById('eventFilter').value
    const res = await API.adminShows('list', { event_id: filterEventId || undefined, page: showsPage, limit: showsLimit })
    const shows = Array.isArray(res) ? res : (res.data || [])
    showsTotal = Array.isArray(res) ? shows.length : (res.total || 0)
    const tbody = document.getElementById('showsBody')
    if (!shows.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="alert alert-info">No shows found.</div></td></tr>'
      document.getElementById('showsPagination').innerHTML = ''
      return
    }
    tbody.innerHTML = shows.map(s => `<tr>
      <td>${s.event_title||'-'}</td>
      <td>${s.show_date}</td>
      <td>${s.start_time}</td>
      <td>₹${s.price_premium}</td>
      <td>₹${s.price_gold}</td>
      <td>₹${s.price_silver}</td>
      <td><span class="badge badge-${s.status==='Active'?'success':s.status==='Cancelled'?'danger':'warning'}">${s.status}</span></td>
      <td><button class="btn btn-sm btn-primary edit-show" data-id="${s.id}">Edit</button><button class="btn btn-sm btn-danger delete-show" data-id="${s.id}">Delete</button></td>
    </tr>`).join('')
    tbody.querySelectorAll('.edit-show').forEach(b => b.addEventListener('click', () => editShow(b.dataset.id)))
    tbody.querySelectorAll('.delete-show').forEach(b => b.addEventListener('click', () => deleteShow(b.dataset.id)))
    window.renderPagination('showsPagination', showsPage, showsTotal, showsLimit, p => loadShows(p))
  } catch(err) { const tbody = document.getElementById('showsBody'); tbody.innerHTML=`<tr><td colspan="8"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
async function filterShows() { loadShows(1) }
document.getElementById('showForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const id = document.getElementById('showId').value
    const d = {
      event_id: document.getElementById('showEventId').value,
      show_date: document.getElementById('showDate').value,
      start_time: document.getElementById('showTime').value,
      duration: parseInt(document.getElementById('showDuration').value) || 120,
      price_premium: parseFloat(document.getElementById('pricePremium').value),
      price_gold: parseFloat(document.getElementById('priceGold').value),
      price_silver: parseFloat(document.getElementById('priceSilver').value),
      booking_cutoff_minutes: 30,
      status: document.getElementById('showStatus').value,
    }
    if (!d.event_id) return alert('Select an event')
    if (id) d.id = id
    await API.adminShows(id ? 'update' : 'create', d)
    loadShows()
    e.target.reset()
    document.getElementById('showId').value = ''
    closeShowModal()
  } catch (err) { alert('Error: ' + err.message) }
})
async function editShow(id) {
  try {
    const all = await API.adminShows('list', { page: 1, limit: 100 })
    const r = (all?.data || all || []).find(x => x.id === id)
    if (!r) { alert('Show not found'); return }
    document.getElementById('showModalTitle').textContent = 'Edit Show'
    document.getElementById('showModal').style.display = 'flex'
    await populateEventDropdown('showEventId', r.event_id)
    document.getElementById('showId').value = r.id
    document.getElementById('showDate').value = r.show_date
    document.getElementById('showTime').value = r.start_time
    document.getElementById('showDuration').value = r.duration ?? 120
    document.getElementById('pricePremium').value = r.price_premium
    document.getElementById('priceGold').value = r.price_gold
    document.getElementById('priceSilver').value = r.price_silver
    document.getElementById('showStatus').value = r.status
  } catch (err) { alert('Error: ' + err.message) }
}
async function deleteShow(id) {
  if (!confirm('Delete?')) return
  try { await API.adminShows('delete', { id }); loadShows() } catch (err) { alert('Error: ' + err.message) }
}
document.addEventListener('DOMContentLoaded', () => loadShows())
