async function generateSeats() {
  const rowsInput = document.getElementById('seatRows').value.trim()
  const seatsPerRow = parseInt(document.getElementById('seatsPerRow').value) || 15
  const categoriesInput = document.getElementById('rowCategories').value.trim()
  if (!rowsInput) return alert('Enter at least one row')
  const rows = rowsInput.split(',').map(r => r.trim().toUpperCase()).filter(Boolean)
  const categories = categoriesInput.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
  const preview = document.getElementById('seatLayoutPreview')
  let html = '<div class="seat-layout">'
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cat = categories[i] || 'silver'
    html += `<div class="seat-row"><span class="seat-row-label">${row}</span>`
    for (let n = 1; n <= seatsPerRow; n++) {
      html += `<div class="seat available" style="font-size:0.65rem;min-width:28px;height:28px;" title="${row}${String(n).padStart(2,'0')} (${cat})">${n}</div>`
    }
    html += '</div>'
  }
  html += '</div>'
  preview.innerHTML = `<div class="screen-indicator">SCREEN</div>${html}
    <p style="margin-top:1rem;color:var(--gray-500);font-size:0.85rem;">
      Preview: ${rows.length} rows, ${seatsPerRow} seats per row = ${rows.length * seatsPerRow} total seats.
      <br><em>Click "Generate Layout" on the selected show in Seating tab to persist.</em>
    </p>`
}
document.addEventListener('DOMContentLoaded', () => {})
