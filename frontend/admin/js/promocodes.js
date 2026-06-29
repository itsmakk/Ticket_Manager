const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)
function notifyErr(m) { if (window.UI) UI.toast(m, 'error'); else alert(m) }
function notifyOk(m) { if (window.UI) UI.toast(m, 'success') }
async function uiConfirm(msg, opts) { return window.UI ? UI.confirm(Object.assign({ message: msg }, opts)) : confirm(msg) }

function showPromoModal() {
  document.getElementById('promoForm').reset()
  document.getElementById('promoId').value = ''
  document.getElementById('promoModalTitle').textContent = 'New Promo Code'
  document.getElementById('promoModal').style.display = 'flex'
}
function closePromoModal() {
  document.getElementById('promoModal').style.display = 'none'
}
function togglePromoValue() {
  const type = document.getElementById('promoType').value
  const group = document.getElementById('promoValueGroup')
  if (type === 'COMPLIMENTARY') { group.style.display = 'none' }
  else { group.style.display = 'block' }
}
async function loadPromos() {
  const t = document.getElementById('promosBody')
  try {
    const promos = await API.adminPromos('list')
    t.innerHTML = (promos||[]).map(p => {
      const dt = (p.discount_type||'').toUpperCase()
      const disp = dt === 'PERCENTAGE' ? p.discount_value+'%' : dt === 'COMPLIMENTARY' ? '100% OFF' : '₹'+p.discount_value
      return `<tr><td>${esc(p.code)}</td><td>${esc(disp)}</td><td>₹${esc(p.max_discount_amount||'-')}</td><td>₹${esc(p.min_order_amount||0)}</td><td>${esc(p.max_uses||'Unlimited')}</td><td>${esc(p.used_count||0)}</td>
      <td><span class="badge badge-${p.is_active?'success':'danger'}">${p.is_active?'Active':'Inactive'}</span></td>
      <td><button class="btn btn-sm btn-primary edit-promo" data-id="${esc(p.id)}">Edit</button><button class="btn btn-sm btn-danger delete-promo" data-id="${esc(p.id)}">Delete</button></td></tr>`}).join('')
    t.querySelectorAll('.edit-promo').forEach(b => b.addEventListener('click', () => editPromo(b.dataset.id)))
    t.querySelectorAll('.delete-promo').forEach(b => b.addEventListener('click', () => deletePromo(b.dataset.id)))
  } catch(err) { t.innerHTML=`<tr><td colspan="8"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('promoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const id = document.getElementById('promoId').value
    const type = document.getElementById('promoType').value
    const d = {
      code: document.getElementById('promoCode').value.toUpperCase(),
      discount_type: type,
      discount_value: type === 'COMPLIMENTARY' ? 100 : parseFloat(document.getElementById('promoValue').value),
      max_uses: document.getElementById('promoUsageLimit').value ? parseInt(document.getElementById('promoUsageLimit').value) : null,
      is_active: document.getElementById('promoStatus').value === 'Active',
    }
    const expiry = document.getElementById('promoExpiry').value
    if (expiry) d.expires_at = expiry
    if (id) d.id = id
    await API.adminPromos(id ? 'update' : 'create', d)
    notifyOk(id ? 'Promo code updated' : 'Promo code created')
    loadPromos()
    e.target.reset()
    document.getElementById('promoId').value = ''
    closePromoModal()
  } catch (err) { notifyErr(err.message) }
})
async function editPromo(id) {
  try {
    const p = (await API.adminPromos('list')).find(x => x.id === id)
    if (!p) return
    document.getElementById('promoId').value = p.id
    document.getElementById('promoCode').value = p.code
    document.getElementById('promoType').value = p.discount_type
    togglePromoValue()
    if (p.discount_type !== 'COMPLIMENTARY') document.getElementById('promoValue').value = p.discount_value
    document.getElementById('promoUsageLimit').value = p.max_uses || ''
    document.getElementById('promoExpiry').value = p.expires_at ? p.expires_at.split('T')[0] : ''
    document.getElementById('promoStatus').value = p.is_active ? 'Active' : 'Inactive'
    document.getElementById('promoModalTitle').textContent = 'Edit Promo Code'
    document.getElementById('promoModal').style.display = 'flex'
  } catch (err) { notifyErr(err.message) }
}
async function deletePromo(id) {
  if (!await uiConfirm('Delete this promo code?', { title: 'Delete promo code', confirmText: 'Delete' })) return
  try { await API.adminPromos('delete', { id }); notifyOk('Promo code deleted'); loadPromos() } catch (err) { notifyErr(err.message) }
}
document.addEventListener('DOMContentLoaded', loadPromos)
