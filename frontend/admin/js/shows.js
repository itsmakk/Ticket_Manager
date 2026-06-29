let showsPage = 1, showsTotal = 0, showsLimit = 20, eventFilterPopulated = false
const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)
function notifyErr(m) { if (window.UI) UI.toast(m, 'error'); else alert(m) }
function notifyOk(m) { if (window.UI) UI.toast(m, 'success') }
function notifyWarn(m) { if (window.UI) UI.toast(m, 'warning'); else alert(m) }
async function uiConfirm(msg, opts) { return window.UI ? UI.confirm(Object.assign({ message: msg }, opts)) : confirm(msg) }
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
  sel.innerHTML = '<option value="">Select Event</option>' + (events?.data || events || []).map(e => `<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('')
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
      <td>${esc(s.event_title||'-')}</td>
      <td>${esc(s.show_date)}</td>
      <td>${esc(s.start_time)}</td>
      <td>₹${esc(s.price_premium)}</td>
      <td>₹${esc(s.price_gold)}</td>
      <td>₹${esc(s.price_silver)}</td>
      <td><span class="badge badge-${s.status==='Active'?'success':s.status==='Cancelled'?'danger':'warning'}">${esc(s.status)}</span></td>
      <td><button class="btn btn-sm btn-primary edit-show" data-id="${esc(s.id)}">Edit</button><button class="btn btn-sm btn-danger delete-show" data-id="${esc(s.id)}">Delete</button></td>
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
    if (!d.event_id) { notifyWarn('Please select an event'); return }
    if (id) d.id = id
    await API.adminShows(id ? 'update' : 'create', d)
    notifyOk(id ? 'Show updated' : 'Show created')
    loadShows()
    e.target.reset()
    document.getElementById('showId').value = ''
    closeShowModal()
  } catch (err) { notifyErr(err.message) }
})
async function editShow(id) {
  try {
    const all = await API.adminShows('list', { page: 1, limit: 100 })
    const r = (all?.data || all || []).find(x => x.id === id)
    if (!r) { notifyErr('Show not found'); return }
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
  } catch (err) { notifyErr(err.message) }
}
async function deleteShow(id) {
  if (!await uiConfirm('Delete this show? This cannot be undone.', { title: 'Delete show', confirmText: 'Delete' })) return
  try { await API.adminShows('delete', { id }); notifyOk('Show deleted'); loadShows() } catch (err) { notifyErr(err.message) }
}
document.addEventListener('DOMContentLoaded', () => loadShows())
