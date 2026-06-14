import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getSupabase(serviceRoleKey: string) {
  return createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)
}

export function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) throw new Error('Unauthorized')
  return auth
}
