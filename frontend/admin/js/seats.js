async function loadShowSelector() {
  const sel = document.getElementById('showSelect')
  const events = await API.adminEvents('list')
  let opts = []; for(const e of (events||[])) { const s=await API.getShows(e.id); (s||[]).forEach(x=>{x.event_title=e.title; opts.push(x)}) }
  sel.innerHTML = '<option value="">Select Show</option>'+opts.map(s=>`<option value="${s.id}">${s.event_title} - ${s.show_date} ${s.start_time}</option>`).join('')
}
async function loadSeats() {
  const sid = document.getElementById('showSelect').value; if(!sid) return
  const t = document.getElementById('seatsTable')
  try {
    const { seats } = await API.getSeatMap(sid)
    t.innerHTML = (seats?Object.entries(seats).flatMap(([r,row])=>row.map(s=>`<tr><td>${s.seat_number}</td><td>${s.row_label||r}</td><td>${s.category}</td><td><span class="badge badge-${s.status==='available'?'success':s.status==='booked'?'danger':'warning'}">${s.status}</span></td>
      <td><button class="btn btn-sm btn-primary" onclick="editSeat('${s.id}')">Edit</button></td></tr>`)):[]).join('')
  } catch(err) { t.innerHTML=`<tr><td colspan="5"><div class="alert alert-danger">${err.message}</div></td></tr>` }
}
document.getElementById('showSelect')?.addEventListener('change', loadSeats)
document.getElementById('generateBtn')?.addEventListener('click', async () => {
  const sid=document.getElementById('showSelect').value; if(!sid)return; if(!confirm('Generate 200 seats?'))return
  await API.adminSeats('generate',{show_id:sid}); loadSeats()
})
document.addEventListener('DOMContentLoaded', loadShowSelector)
