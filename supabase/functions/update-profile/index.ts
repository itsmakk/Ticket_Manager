import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const { full_name, mobile, email } = await req.json()
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const updates: Record<string, string> = {}
    if (typeof full_name === 'string' && full_name.trim()) updates.full_name = full_name.trim()
    if (typeof mobile === 'string' && mobile.trim()) updates.mobile = mobile.trim()
    if (typeof email === 'string' && email.trim()) updates.email = email.trim()

    if (!Object.keys(updates).length) throw new Error('No valid fields to update')

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) throw error

    return corsResponse({ success: true })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
