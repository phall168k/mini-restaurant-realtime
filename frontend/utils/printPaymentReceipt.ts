import type { IPayment } from '~/types/payment'

// Keep receipt content isolated so the admin navigation and drawer never print.
export async function printPaymentReceipt(payment: IPayment, locale: string, t: (key: string) => string) {
  const escape = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
  const row = (label: string, value: unknown) => `<div class="row"><span>${escape(t(`payment.${label}`))}</span><strong>${escape(value)}</strong></div>`
  const items = (payment.order?.items ?? []).filter(item => item.status !== 'CANCELED')
  const html = `<!doctype html><html lang="${locale === 'km' ? 'km' : 'en'}"><head><meta charset="utf-8"><title>${escape(payment.paymentNo)}</title><style>
    @page { margin: 8mm; }
    body { max-width: 72mm; margin: 0 auto; color: #000; font: 12px/1.6 Arial, sans-serif; }
    h1 { text-align: center; font-size: 20px; } .row { display: flex; justify-content: space-between; gap: 12px; }
    strong { text-align: right; } table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 5px 2px; text-align: right; vertical-align: top; } th:first-child, td:first-child { text-align: left; }
    thead, .totals { border-top: 1px dashed; } thead { border-bottom: 1px dashed; } .totals { padding-top: 8px; }
    tr { break-inside: avoid; } span, strong, td { overflow-wrap: anywhere; }
  </style></head><body><h1>${escape(t('payment.receipt'))}</h1>
  ${row('number', payment.paymentNo)}${row('order', payment.order?.orderNumber || payment.orderId)}
  ${row('table', payment.order?.table?.name || payment.order?.table?.code || '—')}
  ${row('created', new Date(payment.createdAt).toLocaleString(locale === 'km' ? 'km-KH' : 'en-US'))}
  ${row('cashier', payment.paidByUser?.username)}${row('method', t(`payment.methods.${payment.paymentMethod}`))}
  <table><thead><tr>${['item', 'quantity', 'price', 'discount'].map(key => `<th>${escape(t(`payment.${key}`))}</th>`).join('')}</tr></thead><tbody>
  ${items.map(line => `<tr><td>${escape((locale === 'km' ? line.item?.nameKh : line.item?.nameEn) || line.item?.code || line.itemId)}</td><td>${escape(line.quantity)}</td><td>${escape(line.unitPrice)}</td><td>${escape(line.discount)}</td></tr>`).join('')}
  </tbody></table><div class="totals">${row('subtotal', payment.subTotal)}${row('discount', payment.discount)}${row('total', payment.total)}${row('receivedAmount', payment.receivedAmount)}${row('changeAmount', payment.changeAmount)}</div>
  ${payment.referenceNo ? row('reference', payment.referenceNo) : ''}</body></html>`
  const frame = document.createElement('iframe')
  frame.title = t('payment.receipt')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:600px;border:0'
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => { clearTimeout(cleanupTimer); frame.remove() }
  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve()
      frame.onerror = () => reject(new Error('Receipt could not load'))
      frame.srcdoc = html
      document.body.appendChild(frame)
    })
    const target = frame.contentWindow
    if (!target) throw new Error('Receipt window unavailable')
    await target.document.fonts.ready
    target.addEventListener('afterprint', cleanup, { once: true })
    target.focus()
    target.print()
    // Fallback for browsers that do not dispatch afterprint for frames.
    cleanupTimer = setTimeout(cleanup, 300_000)
  } catch (error) { cleanup(); throw error }
}
