// Profile & Booking History
let supabaseClient;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

async function loadBookings() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html?redirect=/profile.html';
    return;
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, events(title, poster_url), shows(show_date, start_time), booking_seats(seat_number, seat_id), tickets(ticket_id, status, verification_token)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('bookingsList');

  if (!bookings?.length) {
    container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;"><h3>No Bookings Yet</h3><p style="color:var(--gray-500);margin-top:0.5rem;"><a href="/events.html" class="btn btn-primary">Browse Events</a></p></div>';
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3>${b.events?.title || 'Event'}</h3>
          <p style="color:var(--gray-500);font-size:0.9rem;">
            ${b.shows?.show_date} at ${b.shows?.start_time}
          </p>
          <p style="font-size:0.9rem;">
            <strong>Seats:</strong> ${b.booking_seats?.map(s => s.seat_number).join(', ') || '-'}
          </p>
          <p style="font-size:0.9rem;">
            <strong>Amount:</strong> ₹${b.total_amount}
          </p>
          <p><span class="badge badge-${b.status === 'Confirmed' ? 'success' : 'danger'}">${b.status}</span>
          <span class="badge badge-primary">${b.booking_source}</span></p>
        </div>
        <div style="text-align:right;">
          ${b.tickets?.length ? b.tickets.map(t => `
            <div style="margin-bottom:0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="showTicketQR('${t.ticket_id}', '${t.verification_token}', '${b.events?.title}', '${b.shows?.show_date}', '${b.shows?.start_time}', '${b.booking_seats?.map(s => s.seat_number).join(', ')}')">View Ticket</button>
              <span class="badge badge-${t.status === 'Valid' ? 'success' : 'warning'}">${t.status}</span>
            </div>
          `).join('') : '<span style="color:var(--gray-500);font-size:0.85rem;">No ticket</span>'}
        </div>
      </div>
    </div>
  `).join('');
}

function showTicketQR(ticketId, token, eventName, showDate, showTime, seats) {
  const qrData = JSON.stringify({ ticket_id: ticketId, token: token.slice(0,20) });
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="text-align:center;">
      <div class="modal-header">
        <h2 class="modal-title">Your Ticket</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div style="padding:1rem 0;">
        <p><strong>${eventName}</strong></p>
        <p style="font-size:0.9rem;color:var(--gray-500);">${showDate} | ${showTime}</p>
        <p style="font-size:0.9rem;color:var(--gray-500);">Seats: ${seats}</p>
        <div id="qrcode-${ticketId}" style="margin:1rem auto;width:200px;height:200px;"></div>
        <p style="font-family:monospace;font-size:0.8rem;color:var(--gray-500);">Ticket ID: ${ticketId}</p>
        <button class="btn btn-primary" onclick="downloadTicketPNG('${ticketId}', '${eventName}')">Download Ticket</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Generate QR
  QRCode.toCanvas(document.getElementById(`qrcode-${ticketId}`), JSON.stringify(qrData), { width: 200, margin: 2 }, (err) => {
    if (err) console.error(err);
  });
}

function downloadTicketPNG(ticketId, eventName) {
  const canvas = document.querySelector(`#qrcode-${ticketId} canvas`);
  if (!canvas) { alert('QR not ready yet.'); return; }
  const link = document.createElement('a');
  link.download = `ticket-${ticketId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Check auth on load
document.addEventListener('DOMContentLoaded', async () => {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html?redirect=/profile.html';
    return;
  }
  // Update nav
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (registerBtn) registerBtn.style.display = 'none';
  loadBookings();
});
