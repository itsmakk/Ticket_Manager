const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
let counterSelected = [];

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin' && p.role !== 'counter') { window.location.href = '/'; }
}

async function loadShows() {
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, start_time, events(title)')
    .in('status', ['Upcoming', 'Active'])
    .order('show_date');

  const sel = document.getElementById('counterShow');
  sel.innerHTML = '<option value="">Select Show</option>' +
    (data?.map(s => `<option value="${s.id}">${s.events?.title} - ${s.show_date} ${s.start_time}</option>`).join('') || '');
}

async function loadCounterSeats() {
  const showId = document.getElementById('counterShow').value;
  const area = document.getElementById('counterSeatArea');
  if (!showId) { area.innerHTML = ''; return; }

  const { data: seats } = await supabase
    .from('seats')
    .select('*')
    .order('seat_number');

  if (!seats?.length) {
    area.innerHTML = '<p style="color:var(--gray-500);">No seats configured. Please set up seating layout first.</p>';
    return;
  }

  // Check which seats are booked/locked for this show
  const { data: bookings } = await supabase
    .from('booking_seats')
    .select('seat_id, bookings!inner(show_id, status)')
    .eq('bookings.show_id', showId)
    .in('bookings.status', ['Confirmed']);

  const bookedSeatIds = new Set(bookings?.map(b => b.seat_id) || []);

  const rows = {};
  seats.forEach(s => {
    if (!rows[s.row_number]) rows[s.row_number] = [];
    rows[s.row_number].push(s);
  });

  area.innerHTML = `
    <label class="form-label">Select Seats</label>
    <div class="screen-indicator">SCREEN</div>
    <div class="seat-layout" id="counterSeatLayout">
    ${Object.entries(rows).map(([row, rowSeats]) => `
      <div class="seat-row">
        <span class="seat-row-label">${row}</span>
        ${rowSeats.map(s => {
          const isBooked = bookedSeatIds.has(s.id);
          const isSelected = counterSelected.includes(s.id);
          const cls = isBooked ? 'booked' : isSelected ? 'selected' : 'available';
          return `<div class="seat ${cls}" data-id="${s.id}" data-number="${s.seat_number}" data-category="${s.category}"
            onclick="toggleCounterSeat('${s.id}')" title="${s.seat_number} (${s.category})">${s.seat_number.replace(row, '')}</div>`;
        }).join('')}
        <span class="seat-row-label">${row}</span>
      </div>
    `).join('')}
    </div>`;
}

function toggleCounterSeat(seatId) {
  const idx = counterSelected.indexOf(seatId);
  if (idx > -1) {
    counterSelected.splice(idx, 1);
  } else {
    counterSelected.push(seatId);
  }
  loadCounterSeats();
  updateCounterSummary();
}

function updateCounterSummary() {
  const div = document.getElementById('counterSummary');
  const selDiv = document.getElementById('counterSelectedSeats');
  if (!counterSelected.length) {
    div.style.display = 'none';
    selDiv.innerHTML = '<p style="color:var(--gray-500);">Select seats to book.</p>';
    return;
  }
  div.style.display = 'block';
  selDiv.innerHTML = `<p><strong>${counterSelected.length}</strong> seat(s) selected</p>`;
  div.innerHTML = `<p><strong>Seats Selected:</strong> ${counterSelected.length}</p>`;
}

document.getElementById('counterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const showId = document.getElementById('counterShow').value;
  if (!showId || !counterSelected.length) {
    alert('Please select a show and seats.');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { alert('Please login.'); return; }

  const { data: show } = await supabase.from('shows').select('*').eq('id', showId).single();
  const { data: seats } = await supabase.from('seats').select('*').in('id', counterSelected);

  // Calculate amount
  let totalAmount = 0;
  seats.forEach(s => {
    if (s.category === 'premium') totalAmount += show.price_premium;
    else if (s.category === 'gold') totalAmount += show.price_gold;
    else totalAmount += show.price_silver;
  });

  const bookingData = {
    user_id: session.user.id,
    event_id: show.event_id,
    show_id: showId,
    total_amount: totalAmount,
    status: 'Confirmed',
    booking_source: 'ADMIN_COUNTER',
    payment_status: 'PAID',
    payment_mode: document.getElementById('counterPayment').value,
    customer_name: document.getElementById('counterName').value,
    customer_mobile: document.getElementById('counterMobile').value,
    customer_email: document.getElementById('counterEmail').value || null,
  };

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    alert('Error creating booking: ' + error.message);
    return;
  }

  // Create booking_seats
  const seatInserts = counterSelected.map(seatId => ({
    booking_id: booking.id,
    seat_id: seatId,
    seat_number: seats.find(s => s.id === seatId)?.seat_number,
  }));
  await supabase.from('booking_seats').insert(seatInserts);

  // Update seat statuses
  await supabase.from('seats').update({ status: 'booked' }).in('id', counterSelected);

  // Generate ticket QR
  const ticketData = {
    booking_id: booking.id,
    ticket_id: `TKT-${Date.now()}`,
    verification_token: btoa(`${booking.id}:${Date.now()}`),
    status: 'Valid',
  };
  const { data: ticket } = await supabase.from('tickets').insert(ticketData).select().single();

  alert(`Booking successful!\nBooking ID: ${booking.id.slice(0,8)}...\nTotal: ₹${totalAmount}\nSeats: ${seats.map(s => s.seat_number).join(', ')}`);

  // Reset
  counterSelected = [];
  document.getElementById('counterForm').reset();
  loadCounterSeats();
  updateCounterSummary();
});

checkAdmin();
loadShows();
