export function flattenShowSeat(showSeat: Record<string, any>) {
  const definition = Array.isArray(showSeat.auditorium_seats)
    ? showSeat.auditorium_seats[0]
    : showSeat.auditorium_seats

  if (!definition) throw new Error('Show seat is missing its auditorium seat definition')

  const { auditorium_seats: _definition, ...allocation } = showSeat
  return {
    ...allocation,
    seat_number: definition.seat_number,
    row_label: definition.row_label,
    category: definition.category,
  }
}
