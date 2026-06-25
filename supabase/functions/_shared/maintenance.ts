import { getSupabase } from './supabase.ts'

let cached: { enabled: boolean; until: number } | null = null

export async function isMaintenanceMode(supabase: ReturnType<typeof getSupabase>): Promise<boolean> {
  if (cached && Date.now() < cached.until) return cached.enabled
  const { data } = await supabase.from('maintenance_mode').select('enabled').eq('id', 1).maybeSingle()
  const enabled = data?.enabled === true
  cached = { enabled, until: Date.now() + 30_000 }
  return enabled
}

export async function assertNotMaintenance(supabase: ReturnType<typeof getSupabase>, allowAdmin = false): Promise<void> {
  if (await isMaintenanceMode(supabase)) {
    if (!allowAdmin) throw new Error('System is under maintenance. Bookings are temporarily unavailable.')
  }
}
