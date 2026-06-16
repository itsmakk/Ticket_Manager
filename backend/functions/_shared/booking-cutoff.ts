export function isPastBookingCutoff(show: {
  show_date: string
  start_time: string
  booking_cutoff_minutes?: number | null
}): boolean {
  const cutoffMinutes = show.booking_cutoff_minutes ?? 30
  if (cutoffMinutes <= 0) return false
  if (!show.show_date || !show.start_time) return true
  const showStart = new Date(`${show.show_date}T${show.start_time}`)
  if (isNaN(showStart.getTime())) return true
  const cutoffTime = new Date(showStart.getTime() - cutoffMinutes * 60 * 1000)
  return new Date() >= cutoffTime
}
