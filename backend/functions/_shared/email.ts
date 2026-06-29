import QRCode from 'https://esm.sh/qrcode@1.5.3'

export async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 200, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } })
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email to', to)
    return
  }
  const from = Deno.env.get('RESEND_FROM') || 'CSM Auditorium <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend email failed:', err)
  }
}

export function buildConfirmationHtml(params: {
  eventTitle: string
  showDate: string
  showTime: string
  tickets: Array<{ ticketId: string; seatNumber: string; rowLabel: string; category: string; qrDataUrl: string }>
  totalAmount: string
  bookingId: string
  customerName?: string
  firstTicketId?: string
}): string {
  const ticketRows = params.tickets.map(t => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
        <img src="${t.qrDataUrl}" alt="QR" width="100" height="100" style="display:block;margin:0 auto;border-radius:4px;" />
      </td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:13px;color:#475569;">${t.ticketId.slice(0, 12)}...</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${t.seatNumber}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-transform:capitalize;">${t.category}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { font-family:-apple-system,system-ui,sans-serif; margin:0; padding:0; background:#f8fafc; }
  .container { max-width:600px; margin:0 auto; background:#fff; }
  .header { background:#2563eb; color:#fff; padding:24px 32px; text-align:center; }
  .header h1 { margin:0; font-size:20px; }
  .body { padding:32px; }
  .btn { display:inline-block; background:#2563eb; color:#fff; padding:10px 24px; border-radius:6px; text-decoration:none; font-size:14px; }
  .footer { background:#f1f5f9; padding:20px 32px; text-align:center; font-size:12px; color:#64748b; }
  @media only screen and (max-width:480px) { .body { padding:16px; } td { font-size:12px !important; } }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>&#127915; Booking Confirmed</h1></div>
  <div class="body">
    <p style="font-size:16px;margin:0 0 4px;">Dear ${params.customerName || 'Valued Guest'},</p>
    <p style="color:#475569;margin:0 0 20px;">Your booking at Chatrapati Shivaji Maharaj Auditorium has been confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Event</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.eventTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.showDate}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Time</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.showTime}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Booking ID</td><td style="padding:8px 0;font-size:14px;font-family:monospace;font-weight:600;">${params.bookingId.slice(0, 12)}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Total</td><td style="padding:8px 0;font-size:14px;font-weight:600;">&#8377;${params.totalAmount}</td></tr>
    </table>
    <h3 style="font-size:15px;margin:0 0 12px;">Your Tickets</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;">QR</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Ticket ID</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Seat</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">Category</th></tr></thead>
      <tbody>${ticketRows}</tbody>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${Deno.env.get('SITE_URL') || ''}/ticket.html?ticket_id=${params.firstTicketId || ''}" class="btn">View Ticket</a>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">Present the QR code at the venue entrance for scanning. Each ticket grants entry for one person.</p>
  </div>
  <div class="footer">
    <p style="margin:0 0 4px;">Chatrapati Shivaji Maharaj Auditorium</p>
    <p style="margin:0;">Thank you for your patronage!</p>
  </div>
</div>
</body></html>`
}

export function buildCancellationHtml(params: {
  eventTitle: string
  showDate: string
  showTime: string
  bookingId: string
  refunded: boolean
  refundId?: string
  reason?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { font-family:-apple-system,system-ui,sans-serif; margin:0; padding:0; background:#f8fafc; }
  .container { max-width:600px; margin:0 auto; background:#fff; }
  .header { background:#ef4444; color:#fff; padding:24px 32px; text-align:center; }
  .header h1 { margin:0; font-size:20px; }
  .body { padding:32px; }
  .footer { background:#f1f5f9; padding:20px 32px; text-align:center; font-size:12px; color:#64748b; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>&#10060; Booking Cancelled</h1></div>
  <div class="body">
    <p style="font-size:16px;margin:0 0 20px;">Your booking has been cancelled as requested.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Event</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.eventTitle}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.showDate}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Time</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.showTime}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Booking ID</td><td style="padding:8px 0;font-size:14px;font-family:monospace;font-weight:600;">${params.bookingId.slice(0, 12)}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Refund</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${params.refunded ? 'Refund initiated' + (params.refundId ? ' (' + params.refundId.slice(0, 12) + '...)' : '') : 'No refund applicable'}</td></tr>
      ${params.reason ? `<tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Reason</td><td style="padding:8px 0;font-size:14px;">${params.reason}</td></tr>` : ''}
    </table>
    ${!params.refunded ? '<p style="font-size:13px;color:#64748b;">This was a complimentary or cash booking, so no refund was processed.</p>' : ''}
    <p style="font-size:13px;color:#64748b;">If you have any questions, please contact the venue directly.</p>
  </div>
  <div class="footer">
    <p style="margin:0 0 4px;">Chatrapati Shivaji Maharaj Auditorium</p>
  </div>
</div>
</body></html>`
}
