const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function populateRangeSelects() {
  ;['premium','gold','silver'].forEach(cat => {
    const start = document.getElementById(cat + 'Start')
    const end = document.getElementById(cat + 'End')
    if (!start) return
    start.innerHTML = ALL_LETTERS.map(l => `<option value="${l}">${l}</option>`).join('')
    end.innerHTML = ALL_LETTERS.map(l => `<option value="${l}">${l}</option>`).join('')
  })
}

function getLayoutInput() {
  const rowsInput = document.getElementById('seatRows').value.trim()
  const seatsPerRow = parseInt(document.getElementById('seatsPerRow').value) || 15
  if (!rowsInput) throw new Error('Enter at least one row')
  const rows = rowsInput.split(',').map(r => r.trim().toUpperCase()).filter(Boolean)

  const categories = []
  const catRanges = [
    { name: 'premium', start: document.getElementById('premiumStart').value, end: document.getElementById('premiumEnd').value },
    { name: 'gold', start: document.getElementById('goldStart').value, end: document.getElementById('goldEnd').value },
    { name: 'silver', start: document.getElementById('silverStart').value, end: document.getElementById('silverEnd').value },
  ]
  rows.forEach(row => {
    const match = catRanges.find(r => row >= r.start && row <= r.end)
    categories.push(match ? match.name : 'silver')
  })
  if (categories.length !== rows.length) throw new Error('Category mapping does not cover all rows')
  return { rows, seatsPerRow, categories }
}

function renderLayout(rows, seatsPerRow, categories) {
  const preview = document.getElementById('seatLayoutPreview')
  let html = '<div class="seat-layout">'
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cat = categories[i] || 'silver'
    html += `<div class="seat-row"><span class="seat-row-label">${row}</span>`
    for (let n = 1; n <= seatsPerRow; n++) {
      html += `<div class="seat available category-${cat}" style="font-size:0.65rem;min-width:28px;height:28px;" title="${row}${String(n).padStart(2,'0')} (${cat})">${n}</div>`
    }
    html += '</div>'
  }
  html += '</div>'
  preview.innerHTML = `<div class="screen-indicator">SCREEN</div>${html}
    <p style="margin-top:1rem;color:var(--gray-500);font-size:0.85rem;">
      ${rows.length} rows, ${seatsPerRow} seats per row = ${rows.length * seatsPerRow} total seats.
    </p>`
}

function setCategoryRanges(categories, rows) {
  const cats = ['premium', 'gold', 'silver']
  cats.forEach(c => {
    const indices = categories.map((cat, i) => cat === c ? i : -1).filter(i => i >= 0)
    if (indices.length) {
      document.getElementById(c + 'Start').value = rows[indices[0]]
      document.getElementById(c + 'End').value = rows[indices[indices.length - 1]]
    }
  })
}

async function generateSeats() {
  try {
    const { rows, seatsPerRow, categories } = getLayoutInput()
    renderLayout(rows, seatsPerRow, categories)
    const ok = window.UI
      ? await UI.confirm({ title: 'Save auditorium layout', message: 'Save this as the auditorium layout for every show? Existing layout allocations will be replaced.', confirmText: 'Save layout', danger: false })
      : confirm('Save this as the auditorium layout for every show? Existing layout allocations will be replaced.')
    if (!ok) return
    const result = await API.adminSeats('generate', {
      rows,
      seats_per_row: seatsPerRow,
      categories,
    })
    if (window.UI) UI.toast(`Layout saved — ${result.count} seats.`, 'success'); else alert(`Auditorium layout saved with ${result.count} seats.`)
    await loadSeatLayout()
  } catch (err) {
    if (window.UI) UI.toast(err.message, 'error'); else alert(err.message)
  }
}

async function loadSeatLayout() {
  try {
    const seats = await API.adminSeats('layout')
    if (!seats?.length) return
    const rows = [...new Set(seats.map(seat => seat.row_label))]
    const seatsByRow = new Map(rows.map(row => [row, seats.filter(seat => seat.row_label === row)]))
    const seatsPerRow = Math.max(...[...seatsByRow.values()].map(rowSeats => rowSeats.length))
    const categories = rows.map(row => seatsByRow.get(row)?.[0]?.category || 'silver')
    document.getElementById('seatRows').value = rows.join(',')
    document.getElementById('seatsPerRow').value = seatsPerRow
    setCategoryRanges(categories, rows)
    renderLayout(rows, seatsPerRow, categories)
  } catch (err) {
    document.getElementById('seatLayoutPreview').innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populateRangeSelects()
  document.getElementById('premiumStart').value = 'A'
  document.getElementById('premiumEnd').value = 'F'
  document.getElementById('goldStart').value = 'G'
  document.getElementById('goldEnd').value = 'N'
  document.getElementById('silverStart').value = 'O'
  document.getElementById('silverEnd').value = 'Z'
  loadSeatLayout()
})
