const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

async function loadAudit() {
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  document.getElementById('auditBody').innerHTML = data?.length
    ? data.map(a => `<tr>
      <td style="font-size:0.8rem;">${new Date(a.created_at).toLocaleString()}</td>
      <td style="font-size:0.85rem;">${a.user_id?.slice(0,8) || 'System'}...</td>
      <td>${a.action}</td>
      <td><span class="badge badge-primary">${a.module}</span></td>
      <td style="font-size:0.85rem;color:var(--gray-500);">${a.details || '-'}</td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--gray-500);">No audit logs yet.</td></tr>';
}

checkAdmin();
loadAudit();
