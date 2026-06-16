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
  return `
    <a href="/event-detail.html?id=${e.id}" style="text-decoration:none;color:inherit;display:block;">
      ${e.poster_url
        ? `<img class="scroll-card-img" src="${e.poster_url}" alt="${e.title}" loading="lazy" />`
        : '<div style="height:180px;background:var(--gray-200);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:0.85rem;">No Image</div>'}
      <div class="scroll-card-body">
        <div class="scroll-card-title">${e.title}</div>
        <div class="scroll-card-meta">${e.category || 'Event'}${dateStr ? ' &middot; ' + dateStr : ''}</div>
        <span class="btn btn-primary btn-sm">Book Now</span>
      </div>
    </a>`
}

function buildGridCardHTML(e) {
  return `
    <a href="/event-detail.html?id=${e.id}" class="event-card" style="text-decoration:none;color:inherit;">
      ${e.poster_url
        ? `<img class="event-card-img" src="${e.poster_url}" alt="${e.title}" loading="lazy" />`
        : '<div style="height:200px;background:var(--gray-200);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">No Image</div>'}
      <div class="event-card-body">
        <h3 class="event-card-title">${e.title}</h3>
        <p class="event-card-meta">${e.category || 'Event'}${e.next_show ? ' &middot; ' + formatDate(e.next_show.show_date, e.next_show.start_time) : ''}</p>
        <p style="font-size:0.85rem;color:var(--text-secondary);">${(e.description||'').slice(0,100)}${(e.description||'').length > 100 ? '...' : ''}</p>
      </div>
    </a>`
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
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const nowShowing = []
    const upcoming = []

    for (const e of events) {
      if (e && e.next_show) {
        const showDate = new Date(e.next_show.show_date + 'T' + (e.next_show.start_time || '00:00'))
        if (showDate <= sevenDaysFromNow) {
          nowShowing.push(e)
        } else {
          upcoming.push(e)
        }
      } else {
        upcoming.push(e)
      }
    }

    const nowGrid = document.getElementById('nowShowingGrid')
    if (nowGrid) {
      nowGrid.innerHTML = nowShowing.length
        ? nowShowing.map(e => `<div class="scroll-card">${buildCardHTML(e)}</div>`).join('')
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
