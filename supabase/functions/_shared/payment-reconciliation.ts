export function shouldRefundLatePayment(
  seatIds: string[],
  seats: Array<{ id: string; status: string }>,
  activeLocks: Array<{ seat_id: string; user_id: string; expires_at: string }>,
  userId: string,
  now = Date.now(),
) {
  const seatsById = new Map(seats.map(seat => [seat.id, seat]))
  const locksBySeatId = new Map(
    activeLocks
      .filter(lock => new Date(lock.expires_at).getTime() > now)
      .map(lock => [lock.seat_id, lock]),
  )

  return seatIds.some(seatId => {
    const seat = seatsById.get(seatId)
    if (!seat || seat.status === 'booked' || seat.status === 'blocked') return true
    const lock = locksBySeatId.get(seatId)
    return Boolean(lock && lock.user_id !== userId)
  })
}
