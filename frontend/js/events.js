function getYoutubeEmbedUrl(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : null
}

function openTrailerModal(url) {
  const embed = getYoutubeEmbedUrl(url)
  if (!embed) return
  const existing = document.getElementById('trailerModal')
  if (existing) existing.remove()
  const overlay = document.createElement('div')
  overlay.id = 'trailerModal'
  overlay.className = 'trailer-overlay'
  overlay.innerHTML = `
    <div class="trailer-modal">
      <button class="trailer-close" onclick="closeTrailerModal()">&times;</button>
      <div class="trailer-wrapper">
        <iframe src="${embed}" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
      </div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('active'))
  document.addEventListener('keydown', trapEscape)
}

function closeTrailerModal() {
  const overlay = document.getElementById('trailerModal')
  if (!overlay) return
  overlay.classList.remove('active')
  document.removeEventListener('keydown', trapEscape)
  setTimeout(() => overlay.remove(), 300)
}

function trapEscape(e) {
  if (e.key === 'Escape') closeTrailerModal()
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-trailer-url]')
  if (btn) { e.preventDefault(); openTrailerModal(btn.dataset.trailerUrl); return }
  const overlay = document.getElementById('trailerModal')
  if (overlay && e.target === overlay) closeTrailerModal()
})

function formatDate(dateStr, timeStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + (timeStr ? 'T' + timeStr : ''))
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function buildCardHTML(e) {
  const dateStr = e.next_show ? formatDate(e.next_show.show_date, e.next_show.start_time) : ''
  const hasTrailer = e.trailer_url && getYoutubeEmbedUrl(e.trailer_url)
  return `
    <div class="scroll-card">
      <a href="/event-detail.html?id=${e.id}" class="scroll-card-link">
        <div class="scroll-card-poster">
          ${e.poster_url
            ? `<img class="scroll-card-img" src="${e.poster_url}" alt="${e.title}" loading="lazy" />`
            : '<div class="scroll-card-img" style="background:var(--bg-alt);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:0.85rem;">No Image</div>'}
          ${hasTrailer ? `<div class="poster-overlay" data-trailer-url="${e.trailer_url}"><span class="play-icon">▶</span></div>` : ''}
        </div>
        <div class="scroll-card-body">
          <div class="scroll-card-title">${e.title}</div>
          <div class="scroll-card-meta">${e.category || 'Event'}${dateStr ? ' &middot; ' + dateStr : ''}</div>
        </div>
      </a>
      <div style="padding:0 1rem 1rem;display:flex;gap:0.5rem;">
        <a href="/event-detail.html?id=${e.id}" class="btn btn-primary btn-sm" style="flex:1;text-align:center;">Book Now</a>
        ${hasTrailer ? `<button class="btn btn-outline btn-sm" data-trailer-url="${e.trailer_url}" style="flex:1;">Trailer</button>` : ''}
      </div>
    </div>`
}

function buildGridCardHTML(e) {
  const hasTrailer = e.trailer_url && getYoutubeEmbedUrl(e.trailer_url)
  return `
    <div class="event-card">
      <a href="/event-detail.html?id=${e.id}" style="text-decoration:none;color:inherit;display:block;">
        <div class="event-card-poster">
          ${e.poster_url
            ? `<img class="event-card-img" src="${e.poster_url}" alt="${e.title}" loading="lazy" />`
            : '<div class="event-card-img" style="background:var(--bg-alt);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">No Image</div>'}
        </div>
        <div class="event-card-body">
          <h3 class="event-card-title">${e.title}</h3>
          <p class="event-card-meta">${e.category || 'Event'}${e.next_show ? ' &middot; ' + formatDate(e.next_show.show_date, e.next_show.start_time) : ''}</p>
          <p style="font-size:0.85rem;color:var(--text-secondary);">${(e.description||'').slice(0,100)}${(e.description||'').length > 100 ? '...' : ''}</p>
        </div>
      </a>
      ${hasTrailer ? `<div style="padding:0 1rem 1rem;"><button class="btn btn-outline btn-sm" data-trailer-url="${e.trailer_url}" style="width:100%;">🎬 Watch Trailer</button></div>` : ''}
    </div>`
}

function apiTimeout(ms = 10000) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('API request timed out')), ms))
}

async function loadHomepageEvents() {
  try {
    if (typeof API === 'undefined' || !API.getEvents) {
      throw new Error('API not available — check network connection')
    }
    const events = await Promise.race([API.getEvents(), apiTimeout()])
    if (!Array.isArray(events)) {
      throw new Error('Invalid response from server')
    }
    const nowShowing = []
    const upcoming = []

    for (const e of events) {
      if (e && e.next_show) {
        nowShowing.push(e)
      } else {
        upcoming.push(e)
      }
    }

    const nowGrid = document.getElementById('nowShowingGrid')
    if (nowGrid) {
      nowGrid.innerHTML = nowShowing.length
        ? nowShowing.map(e => buildCardHTML(e)).join('')
        : '<p style="color:var(--text-secondary);padding:1rem 0;">No events currently showing.</p>'
    }

    const upGrid = document.getElementById('upcomingGrid')
    if (upGrid) {
      upGrid.innerHTML = upcoming.length
        ? upcoming.map(e => buildGridCardHTML(e)).join('')
        : '<div class="card" style="text-align:center;padding:3rem;grid-column:1/-1;"><p style="color:var(--text-secondary);">No upcoming events.</p></div>'
    }
  } catch (err) {
    const grids = ['nowShowingGrid', 'upcomingGrid', 'eventsGrid']
    for (const id of grids) {
      const el = document.getElementById(id)
      if (el) el.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load events'}</div>`
    }
  }
}

async function loadEventsPage() {
  try {
    if (typeof API === 'undefined' || !API.getEvents) {
      throw new Error('API not available — check network connection')
    }
    const events = await Promise.race([API.getEvents(), apiTimeout()])
    if (!Array.isArray(events)) {
      throw new Error('Invalid response from server')
    }
    const grid = document.getElementById('eventsGrid')
    if (!grid) return
    if (!events.length) {
      grid.innerHTML = '<div class="card" style="text-align:center;padding:3rem;grid-column:1/-1;"><p style="color:var(--text-secondary);">No events available.</p></div>'
      return
    }
    grid.innerHTML = events.map(e => buildGridCardHTML(e)).join('')
  } catch (err) {
    const grid = document.getElementById('eventsGrid')
    if (grid) grid.innerHTML = `<div class="alert alert-danger">${err.message || 'Failed to load events'}</div>`
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('nowShowingGrid') || document.getElementById('upcomingGrid')) {
    loadHomepageEvents()
  }
  if (document.getElementById('eventsGrid')) {
    loadEventsPage()
  }
})
