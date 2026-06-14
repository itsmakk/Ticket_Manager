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
  e.preventDefault(); const f=e.target; const d={code:f.code.value.toUpperCase(),discount_type:f.discount_type.value,discount_value:parseFloat(f.discount_value.value),max_discount_amount:f.max_discount_amount.value?parseFloat(f.max_discount_amount.value):null,min_order_amount:f.min_order_amount.value?parseFloat(f.min_order_amount.value):0,max_uses:f.max_uses.value?parseInt(f.max_uses.value):null,is_active:f.is_active.checked}
  await API.adminPromos(f._id?.value?'update':'create',f._id?.value?{...d,id:f._id.value}:d); loadPromos(); f.reset(); f._id?.remove(); document.getElementById('formTitle').textContent='Add Promo Code'
})
async function editPromo(id) { const p=(await API.adminPromos('list')).find(x=>x.id===id); if(!p)return; const f=document.getElementById('promoForm'); f._id=p.id; f.code.value=p.code; f.discount_type.value=p.discount_type; f.discount_value.value=p.discount_value; f.max_discount_amount.value=p.max_discount_amount||''; f.min_order_amount.value=p.min_order_amount||0; f.max_uses.value=p.max_uses||''; f.is_active.checked=p.is_active; document.getElementById('formTitle').textContent='Edit Promo Code' }
async function deletePromo(id) { if(!confirm('Delete?'))return; await API.adminPromos('delete',{id}); loadPromos() }
document.addEventListener('DOMContentLoaded', loadPromos)
