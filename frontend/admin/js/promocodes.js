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
  const t = document.getElementById('promosTable')
  try {
    const promos = await API.adminPromos('list')
    t.innerHTML = (promos||[]).map(p => `<tr><td>${p.code}</td><td>${p.discount_type==='percentage'?p.discount_value+'%':'₹'+p.discount_value}</td><td>₹${p.max_discount_amount||'-'}</td><td>₹${p.min_order_amount||0}</td><td>${p.max_uses||'Unlimited'}</td><td>${p.used_count||0}</td>
      <td><span class="badge badge-${p.is_active?'success':'danger'}">${p.is_active?'Active':'Inactive'}</span></td>
      <td><button class="btn btn-sm btn-primary" onclick="editPromo('${p.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deletePromo('${p.id}')">Delete</button></td></tr>`).join('')
  } catch(err) { t.innerHTML=`<tr><td colspan="8"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('promoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
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
  loadPromos()
  e.target.reset()
  document.getElementById('promoId').value = ''
  closePromoModal()
})
async function editPromo(id) {
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
}
async function deletePromo(id) { if(!confirm('Delete?'))return; await API.adminPromos('delete',{id}); loadPromos() }
document.addEventListener('DOMContentLoaded', loadPromos)
