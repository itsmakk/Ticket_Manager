const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

let bookingsData = [];

async function loadBookings() {
  const search = document.getElementById('searchBooking')?.value?.toLowerCase() || '';
  let query = supabase
    .from('bookings')
    .select('*, events(title), shows(show_date, start_time), booking_seats(seat_number)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`id.ilike.%${search}%,customer_name.ilike.%${search}%,customer_mobile.ilike.%${search}%`);
  }

  const { data } = await query;
  bookingsData = data || [];

  document.getElementById('bookingsBody').innerHTML = bookingsData.length
    ? bookingsData.map(b => `<tr>
      <td style="font-family:monospace;font-size:0.8rem;">${b.id.slice(0,8)}...</td>
      <td>${b.customer_name || b.customer_mobile || '-'}</td>
      <td>${b.events?.title || '-'}</td>
      <td>${b.booking_seats?.map(s => s.seat_number).join(', ') || '-'}</td>
      <td>₹${b.total_amount}</td>
      <td><span class="badge badge-primary">${b.booking_source || 'USER'}</span></td>
      <td><span class="badge badge-${b.status === 'Confirmed' ? 'success' : 'danger'}">${b.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewBooking('${b.id}')">View</button>
        ${b.status === 'Confirmed' ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--gray-500);">No bookings found.</td></tr>';
}

async function viewBooking(id) {
  const b = bookingsData.find(x => x.id === id);
  if (!b) return;
  alert(`Booking: ${b.id}\nCustomer: ${b.customer_name || 'N/A'}\nMobile: ${b.customer_mobile || 'N/A'}\nEvent: ${b.events?.title}\nSeats: ${b.booking_seats?.map(s => s.seat_number).join(', ')}\nAmount: ₹${b.total_amount}\nSource: ${b.booking_source}\nStatus: ${b.status}`);
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?\n\nNote: No refund will be processed automatically.')) return;
  const { error } = await supabase.rpc('cancel_booking', { booking_id: id });
  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('Booking cancelled successfully.');
    loadBookings();
  }
}

checkAdmin();
loadBookings();
