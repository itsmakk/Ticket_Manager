const COUNTER_ROLES = new Set(['admin', 'counter'])
const COUNTER_PAYMENT_MODES = new Set(['CASH', 'UPI'])

export function authorizeBookingMode(
  role: string,
  razorpayOrderId: string,
  requestedPaymentMode?: string,
) {
  if (razorpayOrderId === 'counter') {
    if (!COUNTER_ROLES.has(role)) {
      throw new Error('Unauthorized: counter booking requires counter or admin role')
    }

    const paymentMode = requestedPaymentMode?.toUpperCase()
    if (!paymentMode || !COUNTER_PAYMENT_MODES.has(paymentMode)) {
      throw new Error('Counter payment mode must be CASH or UPI')
    }

    return {
      bookingSource: 'ADMIN_COUNTER',
      paymentMode,
      requiresRazorpayVerification: false,
    }
  }

  return {
    bookingSource: 'USER',
    paymentMode: 'ONLINE',
    requiresRazorpayVerification: razorpayOrderId !== 'free',
  }
}
