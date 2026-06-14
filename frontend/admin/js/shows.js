async function loadShows() {
  const sel = document.getElementById('eventFilter')
  const events = await API.adminEvents('list')
  sel.innerHTML = '<option value="">All Events</option>'+(events||[]).map(e=>`<option value="${e.id}">${e.title}</option>`).join('')
  filterShows()
}
async function filterShows() {
  const t = document.getElementById('showsTable'); const eid = document.getElementById('eventFilter').value; const evts = await API.adminEvents('list')
  let shows = []; for(const e of (evts||[]).filter(x=>!eid||x.id===eid)) { const s = await API.getShows(e.id); (s||[]).forEach(x=>x.event_title=e.title); shows=shows.concat(s||[]) }
  t.innerHTML = shows.map(s => `<tr><td>${s.event_title||'-'}</td><td>${s.show_date}</td><td>${s.start_time}</td><td>₹${s.price_premium}</td><td>₹${s.price_gold}</td><td>₹${s.price_silver}</td><td><span class="badge badge-${s.status==='Active'?'success':'warning'}">${s.status}</span></td>
    <td><button class="btn btn-sm btn-primary" onclick="editShow('${s.id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteShow('${s.id}')">Delete</button></td></tr>`).join('')
}
document.getElementById('showForm')?.addEventListener('submit', async (e) => {
  e.preventDefault(); const f=e.target; const events=await API.adminEvents('list'); const ev = (events||[]).find(x=>x.title===f.event_title.value); if(!ev) return alert('Select valid event')
  const d={event_id:ev.id,show_date:f.show_date.value,start_time:f.start_time.value,price_premium:parseFloat(f.price_premium.value),price_gold:parseFloat(f.price_gold.value),price_silver:parseFloat(f.price_silver.value),status:f.status.value}
  await API.adminShows(f._id?.value?'update':'create',f._id?.value?{...d,id:f._id.value}:d); filterShows(); f.reset(); f._id?.remove(); document.getElementById('formTitle').textContent='Add Show'
})
async function editShow(id) { const events=await API.adminEvents('list'); for(const e of events) { const s=await API.getShows(e.id); const r=(s||[]).find(x=>x.id===id); if(r){r.event_title=e.title; const f=document.getElementById('showForm'); f._id=r.id; f.event_title.value=r.event_title; f.show_date.value=r.show_date; f.start_time.value=r.start_time; f.price_premium.value=r.price_premium; f.price_gold.value=r.price_gold; f.price_silver.value=r.price_silver; f.status.value=r.status; document.getElementById('formTitle').textContent='Edit Show'; break }}}
async function deleteShow(id) { if(!confirm('Delete?'))return; await API.adminShows('delete',{id}); filterShows() }
document.addEventListener('DOMContentLoaded', loadShows)
