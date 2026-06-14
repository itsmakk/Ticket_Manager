async function loadCounterEvents() {
  const sel = document.getElementById('eventSelect')
  const events = await API.adminEvents('list')
  sel.innerHTML = '<option value="">Select Event</option>'+(events||[]).filter(e=>e.status==='Active').map(e=>`<option value="${e.id}">${e.title}</option>`).join('')
}
async function loadCounterShows() {
  const eid = document.getElementById('eventSelect').value; const sel = document.getElementById('showSelect'); const sec = document.getElementById('counterSeats'); sec.style.display='none'
  sel.innerHTML = '<option value="">Select Show</option>'; if(!eid) return
  const shows = await API.getShows(eid)
  sel.innerHTML += (shows||[]).map(s=>`<option value="${s.id}">${s.show_date} ${s.start_time}</option>`).join('')
}
async function loadCounterSeatMap() {
  const sid = document.getElementById('showSelect').value; const sec = document.getElementById('counterSeats')
  if(!sid){sec.style.display='none';return}
  sec.style.display='block'
  const { seats } = await API.getSeatMap(sid)
  const html = Object.entries(seats||{}).map(([r,row]) => `<div class="seat-row"><span class="seat-row-label">${r}</span>${row.map(s => `<div class="seat ${s.status}" title="${s.seat_number} (${s.category})">${s.seat_number.replace(r,'')}</div>`).join('')}</div>`).join('')
  document.getElementById('counterSeatMap').innerHTML = `<div class="screen-indicator">SCREEN</div><div class="seat-layout">${html}</div>`
}
async function counterBooking() {
  const sid = document.getElementById('showSelect').value; const email = document.getElementById('customerEmail').value; const name = document.getElementById('customerName').value
  if(!sid||!email||!name) return alert('Fill all fields')
  const events=await API.adminEvents('list'); const event=events.find((e)=>{return true}); if(!event) return
  const shows = await API.getShows(event.id); const show = shows.find(s=>s.id===sid); if(!show) return
  const seats = await API.adminSeats('list',{show_id:sid})
  const avail = (seats||[]).filter(s=>s.status==='available')
  if(!avail.length) return alert('No available seats')
  const seat = avail[0]; const prices={premium:show.price_premium,gold:show.price_gold,silver:show.price_silver}; const amt = prices[seat.category]||200
  await API.lockSeats(sid, [seat.id])
  const sb = window.__apiSupabase||window.supabase?.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  const { data:{user} } = await sb.auth.admin?.createUser({email,password:'Temp123!',email_confirm:true,user_metadata:{full_name:name}}) || {data:{user:null}}
  const uid = user?.id || email
  await API.verifyPayment({ razorpay_order_id:'counter', razorpay_payment_id:'counter-'+Date.now(), razorpay_signature:'counter', show_id:sid, event_id:event.id, seats:[{seat_id:seat.id,category:seat.category}], total_amount:amt, discount_amount:0, promo_code_id:null, user_id:uid, booking_source:'COUNTER' })
  alert('Booking successful!'); loadCounterSeatMap()
}
document.getElementById('eventSelect')?.addEventListener('change', loadCounterShows)
document.getElementById('showSelect')?.addEventListener('change', loadCounterSeatMap)
document.getElementById('counterBtn')?.addEventListener('click', counterBooking)
document.addEventListener('DOMContentLoaded', loadCounterEvents)
