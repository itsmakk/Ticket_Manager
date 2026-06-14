async function loadAudit() {
  const t = document.getElementById('auditTable')
  try {
    const logs = await API.adminAudit()
    t.innerHTML = (logs||[]).map(l => `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.action}</td><td>${l.entity_type||'-'}</td><td>${l.entity_id?.slice(0,8)||'-'}</td><td>${l.details?.slice(0,100)||'-'}</td><td style="font-size:0.85rem;color:var(--gray-500);">${l.user_id?.slice(0,12)||'-'}</td></tr>`).join('')
  } catch(err) { t.innerHTML=`<tr><td colspan="6"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.addEventListener('DOMContentLoaded', loadAudit)
