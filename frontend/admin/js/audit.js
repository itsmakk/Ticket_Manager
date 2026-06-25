let auditPage = 1, auditTotal = 0, auditLimit = 20

async function loadAudit(page) {
  if (page !== undefined) auditPage = page
  const t = document.getElementById('auditBody')
  try {
    const res = await API.admin('audit', 'list', { page: auditPage, limit: auditLimit })
    const logs = Array.isArray(res) ? res : (res.data || [])
    auditTotal = Array.isArray(res) ? logs.length : (res.total || 0)
    t.innerHTML = (logs||[]).map(l => `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.action}</td><td>${l.entity_type||'-'}</td><td>${l.entity_id?.slice(0,8)||'-'}</td><td>${l.details?.slice(0,100)||'-'}</td><td style="font-size:0.85rem;color:var(--gray-500);">${l.user_id?.slice(0,12)||'-'}</td></tr>`).join('')
    window.renderPagination('auditPagination', auditPage, auditTotal, auditLimit, p => loadAudit(p))
  } catch(err) { t.innerHTML=`<tr><td colspan="6"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.addEventListener('DOMContentLoaded', () => loadAudit())
