async function loadEvents() {
  const t = document.getElementById('eventsTable')
  try {
    const events = await API.adminEvents('list')
    t.innerHTML = (events||[]).map(e => `<tr><td>${e.title}</td><td>${e.category||'-'}</td><td><span class="badge badge-${e.status==='Active'?'success':'warning'}">${e.status||'Draft'}</span></td><td>${new Date(e.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-sm btn-primary" onclick="editEvent('${e.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteEvent('${e.id}')">Delete</button></td></tr>`).join('')
  } catch (err) { t.innerHTML = `<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('eventForm')?.addEventListener('submit', async (e) => { e.preventDefault(); const f=e.target, d={title:f.title.value,category:f.category.value,description:f.description.value,status:f.status.value,poster_url:f.poster_url.value}; await API.adminEvents(f._id?.value?'update':'create',f._id?.value?{...d,id:f._id.value}:d); loadEvents(); f.reset(); f._id?.remove(); document.getElementById('formTitle').textContent='Add Event' })
async function editEvent(id) { const r=await API.adminEvents('get',{id}); if(!r)return; const f=document.getElementById('eventForm'); f._id=r.id; ['title','category','description','status','poster_url'].forEach(k => f[k].value=r[k]); document.getElementById('formTitle').textContent='Edit Event' }
async function deleteEvent(id) { if(!confirm('Delete?'))return; await API.adminEvents('delete',{id}); loadEvents() }
document.addEventListener('DOMContentLoaded', loadEvents)
