export function assertOwnedSeatLocks(
  requestedSeatIds: string[],
  locks: Array<{ seat_id: string; user_id: string; expires_at: string }>,
  userId: string,
  now = Date.now(),
) {
  const validOwnedSeatIds = new Set(
    locks
      .filter(lock => lock.user_id === userId && new Date(lock.expires_at).getTime() > now)
      .map(lock => lock.seat_id),
  )

  const unauthorizedSeatIds = requestedSeatIds.filter(seatId => !validOwnedSeatIds.has(seatId))
  if (unauthorizedSeatIds.length > 0) {
    throw new Error('Seat lock is missing, expired, or owned by another user')
  }
}

export function assertResourceCount(requestedIds: string[], returnedIds: string[], resourceName: string) {
  const returned = new Set(returnedIds)
  if (requestedIds.some(id => !returned.has(id))) {
    throw new Error(`Invalid ${resourceName} selection`)
  }
}
