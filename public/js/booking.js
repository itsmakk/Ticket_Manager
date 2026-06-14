// Booking logic - seat selection, locking, payment
let supabaseClient;
let selectedShow = null;
let selectedSeats = [];
let lockTimer = null;
let lockInterval = null;
let promoDiscount = 0;
let promoCodeId = null;
let currentBooking = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Get event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

// Load event details
async function loadEvent() {
  if (!eventId) {
    document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">No event specified.</div>';
    return;
  }

  const supabase = getSupabase();
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();

  if (!event) {
    document.getElementById('eventDetail').innerHTML = '<div class="alert alert-danger">Event not found.</div>';
    return;
  }

  document.getElementById('eventDetail').innerHTML = `
    <div class="card">
      ${event.poster_url ? `<img src="${event.poster_url}" alt="${event.title}" style="width:100%;max-height:300px;object-fit:cover;border-radius:var(--radius);margin-bottom:1rem;" />` : ''}
      <h1>${event.title}</h1>
      <p style="color:var(--gray-500);margin-top:0.5rem;">${event.description || ''}</p>
      <p><span class="badge badge-primary">${event.category || 'Event'}</span></p>
    </div>
  `;

  loadShows();
}

// Load shows for this event
async function loadShows() {
  const supabase = getSupabase();
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .eq('event_id', eventId)
    .in('status', ['Upcoming', 'Active'])
    .order('show_date')
    .order('start_time');

  const container = document.getElementById('showSelector');
  const grid = document.getElementById('showsGrid');

  if (!shows?.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  grid.innerHTML = shows.map(s => {
    const today = new Date().toISOString().split('T')[0];
    const isPast = s.show_date < today;
    return `
      <div class="card event-card" style="cursor:pointer;${selectedShow?.id === s.id ? 'border:2px solid var(--primary);' : ''}"
        onclick="selectShow('${s.id}')">
        <div class="event-card-body">
          <h4>${s.show_date}</h4>
          <p style="font-size:1.2rem;font-weight:600;">${s.start_time}</p>
          <p style="font-size:0.85rem;color:var(--gray-500);">
            Premium: ₹${s.price_premium} | Gold: ₹${s.price_gold} | Silver: ₹${s.price_silver}
          </p>
          ${isPast ? '<span class="badge badge-danger">Expired</span>' : `<span class="badge badge-${s.status === 'Active' ? 'success' : 'primary'}">${s.status}</span>`}
        </div>
      </div>
    `;
  }).join('');
}

// Select a show
async function selectShow(showId) {
  selectedShow = showId;
  selectedSeats = [];
  promoDiscount = 0;
  promoCodeId = null;
  document.getElementById('promoInput').value = '';
  document.getElementById('promoMessage').textContent = '';
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('proceedBtn').style.display = 'block';
  document.getElementById('proceedBtn').disabled = true;

  loadShows();
  loadSeatMap();
}

// Load seat map for selected show
async function loadSeatMap() {
  const supabase = getSupabase();
  const container = document.getElementById('seatSelection');

  if (!selectedShow) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const { data: show } = await supabase.from('shows').select('*').eq('id', selectedShow).single();
  const { data: seats } = await supabase.from('seats').select('*').order('seat_number');

  if (!seats?.length) {
    document.getElementById('seatMap').innerHTML = '<p style="color:var(--gray-500);">No seating layout configured.</p>';
    return;
  }

  // Get booked seats for this show
  const { data: bookedSeats } = await supabase
    .from('booking_seats')
    .select('seat_id, bookings!inner(show_id, status)')
    .eq('bookings.show_id', selectedShow)
    .in('bookings.status', ['Confirmed']);

  // Get locked seats for this show
  const { data: lockedSeats } = await supabase
    .from('seat_locks')
    .select('seat_id')
    .eq('show_id', selectedShow)
    .gte('expires_at', new Date().toISOString());

  const bookedIds = new Set(bookedSeats?.map(b => b.seat_id) || []);
  const lockedIds = new Set(lockedSeats?.map(l => l.seat_id) || []);

  const rows = {};
  seats.forEach(s => {
    if (!rows[s.row_number]) rows[s.row_number] = [];
    let status = 'available';
    if (bookedIds.has(s.id)) status = 'booked';
    else if (lockedIds.has(s.id)) status = 'locked';
    else if (s.status === 'blocked') status = 'blocked';
    rows[s.row_number].push({ ...s, displayStatus: status });
  });

  document.getElementById('seatMap').innerHTML = `
    <div class="screen-indicator">SCREEN</div>
    <div class="seat-layout">
      ${Object.entries(rows).map(([row, rowSeats]) => `
        <div class="seat-row">
          <span class="seat-row-label">${row}</span>
          ${rowSeats.map(s => {
            const isSelected = selectedSeats.includes(s.id);
            const cls = isSelected ? 'selected' : s.displayStatus;
            const clickable = s.displayStatus === 'available' || isSelected;
            return `<div class="seat ${cls}"
              ${clickable ? `onclick="toggleSeat('${s.id}','${s.category}',${show[`price_${s.category}`] || 200})"` : ''}
              title="${s.seat_number} (${s.category} - ₹${show[`price_${s.category}`] || 200})">${s.seat_number.replace(row, '')}</div>`;
          }).join('')}
          <span class="seat-row-label">${row}</span>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;">
      <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;"><span class="seat available" style="width:1rem;height:1rem;"></span> Available</span>
      <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;"><span class="seat selected" style="width:1rem;height:1rem;"></span> Selected</span>
      <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;"><span class="seat booked" style="width:1rem;height:1rem;"></span> Booked</span>
      <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;"><span class="seat locked" style="width:1rem;height:1rem;"></span> Locked</span>
      <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;"><span class="seat blocked" style="width:1rem;height:1rem;"></span> Blocked</span>
    </div>
  `;
}

// Toggle seat selection
function toggleSeat(seatId, category, price) {
  const idx = selectedSeats.indexOf(seatId);
  if (idx > -1) {
    selectedSeats.splice(idx, 1);
  } else {
    selectedSeats.push(seatId);
  }
  loadSeatMap();
  updateSummary(category, price);
}

// Update booking summary
async function updateSummary() {
  const supabase = getSupabase();
  const { data: show } = await supabase.from('shows').select('*').eq('id', selectedShow).single();
  const { data: seats } = await supabase.from('seats').select('*').in('id', selectedSeats);

  const summary = document.getElementById('summaryContent');
  const proceedBtn = document.getElementById('proceedBtn');

  if (!selectedSeats.length) {
    summary.innerHTML = '<p style="color:var(--gray-500);">Select seats to see summary.</p>';
    proceedBtn.disabled = true;
    return;
  }

  let subtotal = 0;
  const seatDetails = seats?.map(s => {
    const price = show[`price_${s.category}`] || 200;
    subtotal += price;
    return `${s.seat_number} (${s.category} - ₹${price})`;
  }).join(', ') || '';

  const total = Math.max(0, subtotal - promoDiscount);

  summary.innerHTML = `
    <p><strong>Seats:</strong> ${seatDetails}</p>
    <p><strong>Subtotal:</strong> ₹${subtotal}</p>
    ${promoDiscount > 0 ? `<p><strong>Discount:</strong> -₹${promoDiscount}</p>` : ''}
    <p style="font-size:1.3rem;font-weight:700;color:var(--primary);"><strong>Total:</strong> ₹${total}</p>
  `;

  proceedBtn.disabled = false;
}

// Apply promo code
async function applyPromo() {
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const msg = document.getElementById('promoMessage');
  if (!code) { msg.textContent = ''; return; }

  const supabase = getSupabase();
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .eq('status', 'Active')
    .single();

  if (!promo) {
    msg.innerHTML = '<span style="color:var(--danger);">Invalid promo code.</span>';
    promoDiscount = 0;
    promoCodeId = null;
    updateSummary();
    return;
  }

  if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
    msg.innerHTML = '<span style="color:var(--danger);">Promo code has expired.</span>';
    promoDiscount = 0;
    promoCodeId = null;
    updateSummary();
    return;
  }

  if (promo.usage_count >= promo.usage_limit) {
    msg.innerHTML = '<span style="color:var(--danger);">Promo code usage limit reached.</span>';
    promoDiscount = 0;
    promoCodeId = null;
    updateSummary();
    return;
  }

  promoCodeId = promo.id;

  if (promo.discount_type === 'COMPLIMENTARY') {
    const { data: show } = await supabase.from('shows').select('*').eq('id', selectedShow).single();
    const { data: seats } = await supabase.from('seats').select('*').in('id', selectedSeats);
    let subtotal = 0;
    seats?.forEach(s => { subtotal += show[`price_${s.category}`] || 200; });
    promoDiscount = subtotal;
    msg.innerHTML = `<span style="color:var(--success);">Complimentary! Free tickets!</span>`;
  } else if (promo.discount_type === 'FIXED') {
    promoDiscount = promo.discount_value;
    msg.innerHTML = `<span style="color:var(--success);">₹${promo.discount_value} off applied!</span>`;
  } else if (promo.discount_type === 'PERCENTAGE') {
    const { data: show } = await supabase.from('shows').select('*').eq('id', selectedShow).single();
    const { data: seats } = await supabase.from('seats').select('*').in('id', selectedSeats);
    let subtotal = 0;
    seats?.forEach(s => { subtotal += show[`price_${s.category}`] || 200; });
    promoDiscount = Math.round(subtotal * promo.discount_value / 100);
    msg.innerHTML = `<span style="color:var(--success);">${promo.discount_value}% off applied! (-₹${promoDiscount})</span>`;
  }

  updateSummary();
}

// Proceed to payment
async function proceedToPayment() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = `/login.html?redirect=/event-detail.html?id=${eventId}`;
    return;
  }

  if (!selectedSeats.length) return;

  // Lock seats
  const lockPromises = selectedSeats.map(seatId =>
    supabase.from('seat_locks').insert({
      seat_id: seatId,
      show_id: selectedShow,
      user_id: session.user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
  );

  await Promise.all(lockPromises);

  document.getElementById('proceedBtn').style.display = 'none';
  document.getElementById('paymentSection').style.display = 'block';
  startLockTimer(5 * 60);
}

// Lock timer
function startLockTimer(seconds) {
  const timerEl = document.getElementById('paymentTimer');
  lockInterval = setInterval(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (seconds <= 0) {
      clearInterval(lockInterval);
      releaseLocks();
      alert('Session expired. Seats have been released.');
      document.getElementById('paymentSection').style.display = 'none';
      document.getElementById('proceedBtn').style.display = 'block';
    }
    seconds--;
  }, 1000);
}

// Release locks
async function releaseLocks() {
  if (lockInterval) clearInterval(lockInterval);
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (session && selectedSeats.length) {
    await supabase.from('seat_locks')
      .delete()
      .in('seat_id', selectedSeats)
      .eq('user_id', session.user.id);
  }
}

// Initiate Razorpay payment
async function initiatePayment() {
  const supabase = getSupabase();
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (!authSession) return;

  const { data: show } = await supabase.from('shows').select('*, events(title)').eq('id', selectedShow).single();
  const { data: seats } = await supabase.from('seats').select('*').in('id', selectedSeats);

  let subtotal = 0;
  seats.forEach(s => { subtotal += show[`price_${s.category}`] || 200; });
  const totalAmount = Math.max(0, subtotal - promoDiscount);

  // Create booking record
  const bookingData = {
    user_id: authSession.user.id,
    event_id: eventId,
    show_id: selectedShow,
    total_amount: totalAmount,
    discount_amount: promoDiscount,
    status: 'Confirmed',
    booking_source: 'USER',
    payment_status: 'PAID',
    payment_mode: 'ONLINE',
    promo_code_id: promoCodeId,
  };

  // For now, create booking directly (in production, verify Razorpay signature server-side)
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    alert('Booking failed: ' + error.message);
    return;
  }

  currentBooking = booking;

  // Create booking seats
  const seatInserts = selectedSeats.map(seatId => ({
    booking_id: booking.id,
    seat_id: seatId,
    seat_number: seats.find(s => s.id === seatId)?.seat_number,
  }));
  await supabase.from('booking_seats').insert(seatInserts);

  // Update seat statuses
  await supabase.from('seats').update({ status: 'booked' }).in('id', selectedSeats);

  // Delete locks
  await supabase.from('seat_locks').delete().in('seat_id', selectedSeats).eq('user_id', authSession.user.id);

  // Generate ticket
  const ticketData = {
    booking_id: booking.id,
    ticket_id: `TKT-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,
    verification_token: btoa(`${booking.id}:${Date.now()}:${Math.random().toString(36)}`).slice(0,40),
    status: 'Valid',
  };
  await supabase.from('tickets').insert(ticketData);

  // Update promo usage
  if (promoCodeId) {
    await supabase.rpc('increment_promo_usage', { promo_id: promoCodeId });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: authSession.user.id,
    action: 'Booking Created',
    module: 'Booking',
    record_id: booking.id,
    details: `Online booking for ${show.events?.title} - ${selectedSeats.length} seats - ₹${totalAmount}`,
  });

  // Clean up timer
  clearInterval(lockInterval);
  selectedSeats = [];

  // Show success
  showBookingSuccess(booking.id, totalAmount);
}

// Show success
function showBookingSuccess(bookingId, amount) {
  document.getElementById('paymentSection').innerHTML = `
    <div style="text-align:center;padding:2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">&#10003;</div>
      <h2 style="color:var(--success);">Booking Confirmed!</h2>
      <p>Booking ID: <strong style="font-family:monospace;">${bookingId.slice(0,8)}...</strong></p>
      <p>Amount Paid: <strong>₹${amount}</strong></p>
      <div style="margin-top:1rem;">
        <a href="/profile.html" class="btn btn-primary">View My Tickets</a>
        <a href="/events.html" class="btn btn-outline">Browse More Events</a>
      </div>
    </div>
  `;
  // Reset selection UI
  document.getElementById('seatMap').innerHTML = '<p style="text-align:center;color:var(--success);font-size:1.2rem;">Booking complete! Check your profile for tickets.</p>';
  document.getElementById('summaryContent').innerHTML = '<p style="color:var(--gray-500);">Booking completed successfully.</p>';
}

// Load event on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check auth for nav
  const token = localStorage.getItem('sb-token');
  if (token) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('registerBtn').style.display = 'none';
    document.getElementById('profileLink').style.display = 'inline-block';
  }
  loadEvent();
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await releaseLocks();
  const supabase = getSupabase();
  await supabase.auth.signOut();
  localStorage.removeItem('sb-token');
  localStorage.removeItem('sb-user');
  window.location.href = '/';
});

// Release locks on page unload
window.addEventListener('beforeunload', () => {
  releaseLocks();
});
