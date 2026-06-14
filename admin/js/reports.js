const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

async function loadReports() {
  // Daily Revenue
  const { data: daily } = await supabase.rpc('daily_revenue_report');
  document.getElementById('dailyReport').innerHTML = daily?.length
    ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Bookings</th><th>Revenue</th></tr></thead>
      <tbody>${daily.slice(0,10).map(r => `<tr><td>${r.date}</td><td>${r.booking_count}</td><td>₹${r.total_revenue}</td></tr>`).join('')}</tbody></table></div>`
    : '<p style="color:var(--gray-500);">No data available.</p>';

  // Monthly Revenue
  const { data: monthly } = await supabase.rpc('monthly_revenue_report');
  document.getElementById('monthlyReport').innerHTML = monthly?.length
    ? `<div class="table-wrap"><table><thead><tr><th>Month</th><th>Revenue</th></tr></thead>
      <tbody>${monthly.slice(0,6).map(r => `<tr><td>${r.month}</td><td>₹${r.total_revenue}</td></tr>`).join('')}</tbody></table></div>`
    : '<p style="color:var(--gray-500);">No data available.</p>';

  // Event-wise Revenue
  const { data: events } = await supabase
    .from('bookings')
    .select('total_amount, events(title)')
    .eq('status', 'Confirmed');
  const eventMap = {};
  events?.forEach(b => {
    const name = b.events?.title || 'Unknown';
    if (!eventMap[name]) eventMap[name] = { revenue: 0, count: 0 };
    eventMap[name].revenue += b.total_amount || 0;
    eventMap[name].count++;
  });
  document.getElementById('eventReport').innerHTML = Object.keys(eventMap).length
    ? `<div class="table-wrap"><table><thead><tr><th>Event</th><th>Bookings</th><th>Revenue</th></tr></thead>
      <tbody>${Object.entries(eventMap).map(([name, d]) => `<tr><td>${name}</td><td>${d.count}</td><td>₹${d.revenue}</td></tr>`).join('')}</tbody></table></div>`
    : '<p style="color:var(--gray-500);">No data available.</p>';

  // Occupancy Report
  const { data: shows } = await supabase
    .from('shows')
    .select('id, show_date, start_time, events(title)')
    .in('status', ['Active', 'Completed'])
    .limit(10);
  const { count: totalSeats } = await supabase.from('seats').select('id', { count: 'exact', head: true });

  let occHtml = '<div class="table-wrap"><table><thead><tr><th>Show</th><th>Occupancy</th></tr></thead><tbody>';
  for (const show of shows || []) {
    const { data: seats } = await supabase
      .from('booking_seats')
      .select('id', { count: 'exact', head: true })
      .eq('bookings.show_id', show.id)
      .eq('bookings.status', 'Confirmed');
    const booked = seats?.length || 0;
    const pct = totalSeats ? Math.round(booked / totalSeats * 100) : 0;
    occHtml += `<tr><td>${show.events?.title} - ${show.show_date}</td><td>${booked}/${totalSeats || 0} (${pct}%)</td></tr>`;
  }
  occHtml += '</tbody></table></div>';
  document.getElementById('occupancyReport').innerHTML = shows?.length ? occHtml : '<p style="color:var(--gray-500);">No show data.</p>';

  // Promo Report
  const { data: promos } = await supabase.rpc('promo_code_report');
  document.getElementById('promoReport').innerHTML = promos?.length
    ? `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Uses</th><th>Discount Given</th></tr></thead>
      <tbody>${promos.map(p => `<tr><td>${p.code}</td><td>${p.usage_count}</td><td>₹${p.total_discount}</td></tr>`).join('')}</tbody></table></div>`
    : '<p style="color:var(--gray-500);">No promo usage data.</p>';
}

checkAdmin();
loadReports();
