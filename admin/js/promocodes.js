const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return; }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/'; }
}

function togglePromoValue() {
  const type = document.getElementById('promoType').value;
  document.getElementById('promoValueGroup').style.display = type === 'COMPLIMENTARY' ? 'none' : 'block';
}

async function loadPromos() {
  const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });

  document.getElementById('promosBody').innerHTML = data?.length
    ? data.map(p => {
      const isExpired = new Date(p.expiry_date) < new Date();
      const status = p.status === 'Inactive' || isExpired ? 'Inactive' : 'Active';
      return `<tr>
        <td><strong>${p.code}</strong></td>
        <td>${p.discount_type === 'FIXED' ? '₹' + p.discount_value : p.discount_type === 'PERCENTAGE' ? p.discount_value + '%' : '100% FREE'}</td>
        <td>${p.usage_count || 0}/${p.usage_limit || '∞'}</td>
        <td>${p.expiry_date || 'No expiry'}</td>
        <td><span class="badge badge-${status === 'Active' ? 'success' : 'danger'}">${status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editPromo('${p.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="togglePromoStatus('${p.id}', '${p.status}')">${p.status === 'Active' ? 'Disable' : 'Enable'}</button>
        </td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--gray-500);">No promo codes.</td></tr>';
}

function showPromoModal() {
  document.getElementById('promoForm').reset();
  document.getElementById('promoId').value = '';
  document.getElementById('promoModalTitle').textContent = 'New Promo Code';
  document.getElementById('promoModal').style.display = 'flex';
}

function closePromoModal() {
  document.getElementById('promoModal').style.display = 'none';
}

async function editPromo(id) {
  const { data } = await supabase.from('promo_codes').select('*').eq('id', id).single();
  if (!data) return;
  document.getElementById('promoId').value = id;
  document.getElementById('promoCode').value = data.code;
  document.getElementById('promoDescription').value = data.description || '';
  document.getElementById('promoType').value = data.discount_type;
  document.getElementById('promoValue').value = data.discount_value || 0;
  document.getElementById('promoUsageLimit').value = data.usage_limit || 100;
  document.getElementById('promoExpiry').value = data.expiry_date || '';
  document.getElementById('promoStatus').value = data.status || 'Active';
  document.getElementById('promoModalTitle').textContent = 'Edit Promo Code';
  document.getElementById('promoModal').style.display = 'flex';
  togglePromoValue();
}

document.getElementById('promoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('promoId').value;
  const data = {
    code: document.getElementById('promoCode').value.toUpperCase(),
    description: document.getElementById('promoDescription').value,
    discount_type: document.getElementById('promoType').value,
    discount_value: document.getElementById('promoType').value === 'COMPLIMENTARY' ? 100 : parseFloat(document.getElementById('promoValue').value),
    usage_limit: parseInt(document.getElementById('promoUsageLimit').value),
    expiry_date: document.getElementById('promoExpiry').value || null,
    status: document.getElementById('promoStatus').value,
  };
  if (id) {
    await supabase.from('promo_codes').update(data).eq('id', id);
  } else {
    await supabase.from('promo_codes').insert(data);
  }
  closePromoModal();
  loadPromos();
});

async function togglePromoStatus(id, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  await supabase.from('promo_codes').update({ status: newStatus }).eq('id', id);
  loadPromos();
}

checkAdmin();
loadPromos();
