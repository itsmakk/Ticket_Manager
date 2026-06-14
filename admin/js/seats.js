const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

async function generateSeats() {
  const rowsStr = document.getElementById('seatRows').value;
  const seatsPerRow = parseInt(document.getElementById('seatsPerRow').value);
  const catsStr = document.getElementById('rowCategories').value;

  const rows = rowsStr.split(',').map(r => r.trim()).filter(Boolean);
  const categories = catsStr.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const categoryMap = ['premium', 'gold', 'silver'];

  // Delete existing seats
  await supabase.from('seats').delete().neq('id', '0');

  const seats = [];
  rows.forEach((row, ri) => {
    const cat = categories[ri] || categoryMap[Math.min(ri, 2)];
    for (let i = 1; i <= seatsPerRow; i++) {
      seats.push({
        seat_number: `${row}${i}`,
        row_number: row,
        category: cat,
        status: 'available',
      });
    }
  });

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < seats.length; i += batchSize) {
    await supabase.from('seats').insert(seats.slice(i, i + batchSize));
  }

  alert(`Generated ${seats.length} seats!`);
  loadSeatPreview();
}

async function loadSeatPreview() {
  const { data } = await supabase.from('seats').select('*').order('seat_number');
  const container = document.getElementById('seatLayoutPreview');

  if (!data?.length) {
    container.innerHTML = '<p style="color:var(--gray-500);">Click "Generate Layout" to create seating.</p>';
    return;
  }

  const rows = {};
  data.forEach(s => {
    if (!rows[s.row_number]) rows[s.row_number] = [];
    rows[s.row_number].push(s);
  });

  container.innerHTML = `
    <div class="screen-indicator">SCREEN</div>
    <div class="seat-layout">
    ${Object.entries(rows).map(([row, seats]) => `
      <div class="seat-row">
        <span class="seat-row-label">${row}</span>
        ${seats.map(s => `<div class="seat ${s.status}" title="${s.seat_number} (${s.category})">${s.seat_number.replace(row, '')}</div>`).join('')}
        <span class="seat-row-label">${row}</span>
      </div>
    `).join('')}
    </div>
    <p style="text-align:center;margin-top:1rem;color:var(--gray-500);font-size:0.85rem;">
      Total: ${data.length} seats | 
      Premium: ${data.filter(s => s.category === 'premium' && s.status === 'available').length} | 
      Gold: ${data.filter(s => s.category === 'gold' && s.status === 'available').length} |
      Silver: ${data.filter(s => s.category === 'silver' && s.status === 'available').length}
    </p>`;
}

checkAdmin();
loadSeatPreview();
