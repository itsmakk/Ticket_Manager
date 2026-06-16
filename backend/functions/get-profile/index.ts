import { getSupabase, getUser, corsResponse, handleCors } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const userId = await getUser(req)
    const supabase = getSupabase(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !profile) throw new Error('Profile not found')
    return corsResponse({ id: profile.id, role: profile.role, mobile: profile.mobile, email: profile.email, full_name: profile.full_name })
  } catch (err) {
    return corsResponse({ error: err.message }, 400)
  }
})
