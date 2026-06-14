// Events — ALL data through API (Edge Functions)
async function loadEvents() {
  try {
    const events = await API.getEvents()
    const grid = document.getElementById('eventsGrid')
    if (!grid) return
    if (!events?.length) {
      grid.innerHTML = '<div class="card" style="text-align:center;padding:3rem;grid-column:1/-1;"><p style="color:var(--gray-500);">No events available.</p></div>'
      return
    }
    grid.innerHTML = events.map(e => `
      <a href="/event-detail.html?id=${e.id}" class="event-card" style="text-decoration:none;color:inherit;">
        ${e.poster_url ? `<img class="event-card-img" src="${e.poster_url}" alt="${e.title}" />` : '<div style="height:200px;background:var(--gray-200);display:flex;align-items:center;justify-content:center;color:var(--gray-500);">No Image</div>'}
        <div class="event-card-body">
          <h3 class="event-card-title">${e.title}</h3>
          <p class="event-card-meta">${e.category || 'Event'}</p>
          <p style="font-size:0.85rem;color:var(--gray-500);">${(e.description||'').slice(0,100)}${(e.description||'').length > 100 ? '...' : ''}</p>
        </div>
      </a>`).join('')
  } catch (err) {
    const grid = document.getElementById('eventsGrid')
    if (grid) grid.innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
}
document.addEventListener('DOMContentLoaded', () => {
  loadEvents()
  const t = localStorage.getItem('sb-token')
  if (t) {
    const lb = document.getElementById('loginBtn'); if(lb) lb.style.display='none'
    const pl = document.getElementById('profileLink'); if(pl) pl.style.display='inline-block'
  }
})
