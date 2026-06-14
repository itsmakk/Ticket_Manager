import { getSupabase } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  try {
    const { show_id } = await req.json()
    if (!show_id) throw new Error('show_id is required')
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: show, error: se } = await supabase.from('shows').select('*').eq('id', show_id).single()
    if (se || !show) throw new Error('Show not found')

    const { data: seats, error: ste } = await supabase.from('seats').select('*').eq('show_id', show_id).order('seat_number', { ascending: true })
    if (ste) throw ste

    // Group by row
    const grouped: Record<string, any[]> = {}
    for (const seat of seats || []) {
      const row = seat.seat_number.charAt(0)
      if (!grouped[row]) grouped[row] = []
      grouped[row].push(seat)
    }
    for (const row of Object.keys(grouped)) {
      grouped[row].sort((a, b) => parseInt(a.seat_number.slice(1)) - parseInt(b.seat_number.slice(1)))
    }

    return new Response(JSON.stringify({ show, seats: grouped }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
})
