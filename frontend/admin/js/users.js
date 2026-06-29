let usersPage = 1, usersTotal = 0, usersLimit = 20
const esc = (s) => window.UI ? UI.escapeHtml(s) : String(s == null ? '' : s)
async function loadUsers(page) {
  if (page !== undefined) usersPage = page
  const tbody = document.getElementById('usersBody')
  const alertDiv = document.getElementById('alert')
  try {
    const res = await API.adminUsers('list', { page: usersPage, limit: usersLimit })
    const users = Array.isArray(res) ? res : (res.data || [])
    usersTotal = Array.isArray(res) ? users.length : (res.total || 0)
    tbody.innerHTML = users.map(u => {
      const roleOptions = ['user', 'counter', 'scanner', 'admin']
        .map(r => `<option value="${r}"${u.role === r ? ' selected' : ''}>${r}</option>`).join('')
      const lastSignIn = u.last_sign_in ? new Date(u.last_sign_in).toLocaleString() : '-'
      return `<tr>
        <td>${esc(u.email || '-')}</td>
        <td>${esc(u.full_name || '-')}</td>
        <td>${esc(u.mobile || '-')}</td>
        <td class="role-badge role-${esc(u.role)}">${esc(u.role)}</td>
        <td>${esc(lastSignIn)}</td>
        <td>
          <select data-user-id="${esc(u.id)}" data-current-role="${esc(u.role)}" class="role-select" aria-label="Role for ${esc(u.email || u.id)}">
            ${roleOptions}
          </select>
          <button class="btn btn-sm btn-primary" onclick="updateRole('${esc(u.id)}')">Save</button>
        </td>
      </tr>`
    }).join('')
    window.renderPagination('usersPagination', usersPage, usersTotal, usersLimit, p => loadUsers(p))
  } catch (err) {
    alertDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
}
async function updateRole(userId) {
  const sel = document.querySelector(`select[data-user-id="${userId}"]`)
  const newRole = sel.value
  const currentRole = sel.dataset.currentRole
  if (newRole === currentRole) return
  const alertDiv = document.getElementById('alert')
  const ok = window.UI
    ? await UI.confirm({ title: 'Change user role', message: `Change this user's role to "${newRole}"?`, confirmText: 'Change role', danger: false })
    : confirm(`Change role to ${newRole}?`)
  if (!ok) { sel.value = currentRole; return }
  try {
    await API.adminUsers('update_role', { id: userId, role: newRole })
    if (window.UI) { UI.showAlert(alertDiv, `Role updated to ${newRole}`, 'success'); UI.toast('Role updated', 'success') }
    else alertDiv.innerHTML = `<div class="alert alert-success">Role updated to ${newRole}</div>`
    sel.dataset.currentRole = newRole
    const badge = sel.closest('tr').querySelector('.role-badge')
    badge.textContent = newRole
    badge.className = `role-badge role-${newRole}`
  } catch (err) {
    if (window.UI) { UI.showAlert(alertDiv, err.message, 'danger'); UI.toast(err.message, 'error') }
    else alertDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`
  }
}
document.addEventListener('DOMContentLoaded', () => loadUsers())
