import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function getSupabase(serviceRoleKey: string) {
  return createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)
}

export function getUser(req: Request) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) throw new Error('Unauthorized')
  return auth
}

export function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  return null
}
