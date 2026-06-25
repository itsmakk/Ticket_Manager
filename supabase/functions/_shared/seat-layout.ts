export function buildAuditoriumLayout(
  rowsInput: unknown,
  seatsPerRowInput: unknown,
  categoriesInput: unknown,
) {
  const rows = Array.isArray(rowsInput)
    ? rowsInput.map(row => String(row).trim().toUpperCase()).filter(Boolean)
    : []
  const seatsPerRow = Number(seatsPerRowInput)
  const categories = Array.isArray(categoriesInput) ? categoriesInput : []

  if (!rows.length || !Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 30) {
    throw new Error('A valid row list and seats-per-row value are required')
  }
  if (new Set(rows).size !== rows.length) throw new Error('Duplicate row labels are not allowed')

  return rows.flatMap((row, rowIndex) => {
    if (!/^[A-Z]{1,3}$/.test(row)) throw new Error(`Invalid row label: ${row}`)
    const category = String(categories[rowIndex] || 'silver').trim().toLowerCase()
    if (!category) throw new Error(`Invalid category for row ${row}`)

    return Array.from({ length: seatsPerRow }, (_, seatIndex) => ({
      seat_number: `${row}${String(seatIndex + 1).padStart(2, '0')}`,
      category,
      row_label: row,
      is_active: true,
    }))
  })
}
