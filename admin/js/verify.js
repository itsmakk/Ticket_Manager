const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin' && p.role !== 'counter') { window.location.href = '/'; }
}

async function verifyTicket() {
  const ticketId = document.getElementById('ticketId').value.trim();
  const resultDiv = document.getElementById('verifyResult');

  if (!ticketId) {
    resultDiv.innerHTML = '<div class="alert alert-danger">Please enter a Ticket ID.</div>';
    return;
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, bookings!inner(id, status, customer_name, customer_mobile, total_amount, events(title), shows(show_date, start_time))')
    .eq('ticket_id', ticketId)
    .single();

  if (!ticket) {
    resultDiv.innerHTML = '<div class="alert alert-danger">Ticket not found. Please check the Ticket ID.</div>';
    return;
  }

  const b = ticket.bookings;
  let status = 'Valid';
  let color = 'success';
  let message = '';

  if (b.status === 'Cancelled') {
    status = 'Cancelled'; color = 'danger';
    message = 'This booking has been cancelled.';
  } else if (ticket.status === 'Used') {
    status = 'Already Used'; color = 'warning';
    message = 'This ticket has already been used for entry.';
  } else if (ticket.status === 'Cancelled') {
    status = 'Cancelled'; color = 'danger';
    message = 'This ticket has been cancelled.';
  }

  resultDiv.innerHTML = `
    <div class="alert alert-${color}" style="text-align:left;">
      <strong style="font-size:1.2rem;">${status}</strong>
      ${message ? '<p>' + message + '</p>' : ''}
      <hr style="margin:0.5rem 0;">
      <p><strong>Event:</strong> ${b.events?.title}</p>
      <p><strong>Date/Time:</strong> ${b.shows?.show_date} ${b.shows?.start_time}</p>
      <p><strong>Customer:</strong> ${b.customer_name || 'N/A'}</p>
      <p><strong>Ticket:</strong> ${ticket.ticket_id}</p>
      ${status === 'Valid' ? `<button class="btn btn-success btn-block" onclick="markUsed('${ticket.id}')">Mark as Used</button>` : ''}
    </div>
  `;
}

async function markUsed(ticketId) {
  if (!confirm('Mark this ticket as used? This action cannot be undone.')) return;
  const { error } = await supabase
    .from('tickets')
    .update({ status: 'Used', used_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('Ticket marked as used successfully.');
    document.getElementById('ticketId').value = '';
    document.getElementById('verifyResult').innerHTML = '';
  }
}

checkAdmin();
