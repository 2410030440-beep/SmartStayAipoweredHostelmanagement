import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, CreditCard, FileText, LockKeyhole, X } from 'lucide-react'
import { paymentService, studentService, type DemoPaymentRecord, type FeeConfiguration, type PaymentRecord, type PaymentSummary } from './services'
import './payments-demo.css'

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const money = (value: number | null | undefined) => value === null || value === undefined ? 'Not configured' : rupees.format(Number(value))
const methods = ['UPI / QR', 'Debit Card', 'Credit Card', 'Net Banking'] as const
type DemoMethod = typeof methods[number]

function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null
  return <div className={`payments-notice ${error ? 'error' : 'success'}`} role="status">{error || success}</div>
}

function Status({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  return <span className={`payments-status ${demo ? 'demo' : 'verified'}`}>{children}</span>
}

function methodLabel(method: string | null) {
  return method === 'UPI' ? 'UPI' : method === 'BANK_TRANSFER' ? 'Bank transfer' : method || 'Not specified'
}

type CardForm = { cardholder: string; number: string; expiry: string; cvv: string }
const emptyCard: CardForm = { cardholder: '', number: '', expiry: '', cvv: '' }

export function StudentPaymentsPage() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [form, setForm] = useState({ academic_year: '2026-2027', study_year: '1st Year', semester: 'Not Applicable', payment_for: 'Hostel Fee', email: '', contact_number: '', amount: '', method: 'UPI / QR' as DemoMethod })
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [completed, setCompleted] = useState<DemoPaymentRecord | null>(null)
  const [card, setCard] = useState<CardForm>(emptyCard)
  const [bank, setBank] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [nextSummary, profile] = await Promise.all([paymentService.mySummary(), studentService.getProfile()])
      setSummary(nextSummary)
      setForm((current) => ({ ...current, email: current.email || profile.email, contact_number: current.contact_number || profile.phone }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load payment information.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const openCheckout = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const amount = summary?.outstanding ?? 0
    if (!form.email.trim() || !form.contact_number.trim() || amount <= 0) {
      setError('A configured outstanding fee and valid contact details are required before paying.')
      return
    }
    if (!/^\+?[0-9()\- .]{7,30}$/.test(form.contact_number.trim())) {
      setError('Enter a valid contact number.')
      return
    }
    if (summary?.outstanding === null || summary?.outstanding === undefined) {
      setError('An administrator must configure hostel fees before a demo payment can be created.')
      return
    }
    if (amount > summary.outstanding) {
      setError(`The demo amount cannot exceed the outstanding balance of ${money(summary.outstanding)}.`)
      return
    }
    setCheckoutOpen(true)
  }

  const simulate = async () => {
    const amount = summary?.outstanding ?? 0
    if (amount <= 0) {
      setError('There is no configured outstanding balance to pay.')
      return
    }
    if ((form.method === 'Debit Card' || form.method === 'Credit Card') && (!card.cardholder.trim() || !/^\d{16}$/.test(card.number.replace(/\s/g, '')) || !/^\d{2}\/\d{2}$/.test(card.expiry) || !/^\d{3,4}$/.test(card.cvv))) {
      setError('Enter a valid cardholder name, 16-digit card number, MM/YY expiry, and CVV. Card details are used only for this demo.')
      return
    }
    if (form.method === 'Net Banking' && !bank) {
      setError('Select a bank before simulating the payment.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const orderId = `DEMO-ORDER-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`
      const transaction = await paymentService.createDemo({ ...form, amount, method: form.method, order_id: orderId })
      setCompleted(transaction)
      setCard(emptyCard)
      setBank('')
      setCheckoutOpen(false)
      setSuccess('Demo transaction saved as unverified. It did not change your verified balance.')
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the demo transaction.')
    } finally {
      setBusy(false)
    }
  }

  const records = summary ? [
    ...summary.payments.map((item) => ({ id: `verified-${item.id}`, amount: Number(item.amount), date: item.payment_date || item.created_at, method: methodLabel(item.method), reference: item.reference || '-', status: 'Verified', demo: false })),
    ...summary.demo_payments.map((item) => ({ id: `demo-${item.id}`, amount: Number(item.amount), date: item.created_at, method: item.method, reference: item.transaction_id, status: 'DEMO - UNVERIFIED', demo: true })),
  ] : []

  return <div className="payments-page">
    <div className="page-header"><div><span className="eyebrow">CLEAR & SIMPLE</span><h1>Payments</h1><p>View your fee balance and use the labelled demo checkout.</p></div><span className="payments-demo-mark"><LockKeyhole size={14} /> Demo environment</span></div>
    <Notice error={error} success={success} />
    {loading ? <section className="panel payments-empty">Loading payment information...</section> : <>
      <div className="payments-summary-grid"><div><span>Total hostel fee</span><strong>{money(summary?.total_fee)}</strong><small>Configured by an administrator</small></div><div><span>Verified paid</span><strong>{money(summary?.verified_paid)}</strong><small>Offline payments only</small></div><div><span>Outstanding</span><strong>{money(summary?.outstanding)}</strong><small>{summary?.due_date ? `Due ${summary.due_date}` : 'No due date configured'}</small></div><div><span>Payment status</span><strong>{summary?.payment_status === 'NOT_CONFIGURED' ? 'Not configured' : summary?.payment_status === 'PAID' ? 'Paid' : 'Due'}</strong><small>Demo transactions never affect this status</small></div></div>
      <section className="panel payments-card"><div className="payments-card-heading"><div><span className="eyebrow">DEMO CHECKOUT</span><h2>Make a demo payment</h2></div><CreditCard size={20} /></div><div className="payments-demo-warning"><CircleAlert size={17} /><span><strong>DEMO ONLY - NO MONEY WILL BE TRANSFERRED.</strong><br />This checkout stores an unverified demonstration record only.</span></div><form className="payments-form" onSubmit={openCheckout}><div className="payments-field-grid"><label>Academic year<select value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })}><option>2026-2027</option><option>2025-2026</option><option>2027-2028</option></select></label><label>Study year<select value={form.study_year} onChange={(event) => setForm({ ...form, study_year: event.target.value })}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></label><label>Semester<select value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option>Odd</option><option>Even</option><option>Not Applicable</option></select></label><label>Payment for<select value={form.payment_for} onChange={(event) => setForm({ ...form, payment_for: event.target.value })}><option>Hostel Fee</option><option>Mess Fee</option><option>Other Fee</option></select></label><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Phone number<input required type="tel" value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} /></label><label>Configured amount<input readOnly value={summary?.outstanding ? money(summary.outstanding) : 'Not configured'} /></label><label>Payment method<select value={form.method} onChange={(event) => { setForm({ ...form, method: event.target.value as DemoMethod }); setQrFailed(false) }}>{methods.map((method) => <option key={method}>{method}</option>)}</select></label></div><button className="button payments-submit" type="submit" disabled={!summary?.outstanding}>Pay {money(summary?.outstanding)} <ArrowRight size={15} /></button></form></section>
      <section className="panel payments-card"><div className="payments-card-heading"><div><span className="eyebrow">TRANSACTION HISTORY</span><h2>Payment history</h2></div><FileText size={20} /></div>{records.length === 0 ? <div className="payments-empty"><FileText size={22} /><strong>No payment records yet</strong><span>Verified payments and demo transactions will appear here.</span></div> : <div className="payments-table-wrap"><table><thead><tr><th>Amount</th><th>Date</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{money(record.amount)}</strong></td><td>{new Date(record.date).toLocaleDateString()}</td><td>{record.method}</td><td>{record.reference}</td><td><Status demo={record.demo}>{record.status}</Status></td></tr>)}</tbody></table></div>}</section>
    </>}
    {completed && <div className="payments-modal-backdrop"><div className="payments-modal" role="dialog" aria-modal="true" aria-labelledby="demo-success-title"><div className="payments-success-icon"><CheckCircle2 size={28} /></div><h2 id="demo-success-title">Demo payment recorded</h2><p>No money was transferred and your verified balance is unchanged.</p><dl><div><dt>Amount</dt><dd>{money(Number(completed.amount))}</dd></div><div><dt>Method</dt><dd>{completed.method}</dd></div><div><dt>Transaction ID</dt><dd>{completed.transaction_id}</dd></div><div><dt>Status</dt><dd><Status demo>DEMO - UNVERIFIED</Status></dd></div></dl><button className="button payments-submit" onClick={() => setCompleted(null)}>Close</button></div></div>}
    {checkoutOpen && !completed && <div className="payments-modal-backdrop"><div className="payments-modal payments-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="payments-modal-close" onClick={() => !busy && setCheckoutOpen(false)} aria-label="Close checkout"><X size={18} /></button><span className="eyebrow">DEMO CHECKOUT</span><h2 id="checkout-title">Pay {money(summary?.outstanding)}</h2><p>Method: {form.method}. This is a simulated checkout and cannot verify a real payment.</p>{(form.method === 'Debit Card' || form.method === 'Credit Card') && <div className="payments-form"><label>Cardholder name<input value={card.cardholder} onChange={(event) => setCard({ ...card, cardholder: event.target.value })} autoComplete="off" /></label><label>Card number<input inputMode="numeric" maxLength={19} value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value.replace(/[^0-9 ]/g, '') })} autoComplete="off" /></label><div className="payments-field-grid"><label>Expiry date<input placeholder="MM/YY" maxLength={5} value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} autoComplete="off" /></label><label>CVV<input type="password" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(event) => setCard({ ...card, cvv: event.target.value.replace(/\D/g, '') })} autoComplete="off" /></label></div><small>Card details stay in this browser for this demo only and are never stored or sent to SmartStay.</small></div>}{form.method === 'UPI / QR' && <div className="payments-qr-wrap">{qrFailed ? <div className="payments-qr-missing"><CircleAlert size={22} /><span>The saved QR image could not be located at <strong>/hostel-payment-demo-qr.png</strong>. Provide the saved image path to enable QR display.</span></div> : <img src="/hostel-payment-demo-qr.png" alt="Saved demo payment QR code" className="payments-qr" onError={() => setQrFailed(true)} />}<strong>DEMO ONLY - {money(summary?.outstanding)}</strong><small>No payment destination has been verified.</small></div>}{form.method === 'Net Banking' && <label>Bank<select value={bank} onChange={(event) => setBank(event.target.value)}><option value="">Select a bank</option><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option></select></label>}<button className="button payments-submit" onClick={() => void simulate()} disabled={busy}>{busy ? 'Saving demo transaction...' : 'Simulate Payment'}</button><button className="payments-back-button" onClick={() => !busy && setCheckoutOpen(false)} disabled={busy}>Cancel</button></div></div>}
  </div>
}

export function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentRecord[]>([])
  const [config, setConfig] = useState<FeeConfiguration | null>(null)
  const [filter, setFilter] = useState({ status: '', studentId: '' })
  const [configForm, setConfigForm] = useState({ academic_period: '', total_fee: '', due_date: '' })
  const [recordForm, setRecordForm] = useState({ student_id: '', amount: '', payment_date: '', method: 'CASH', reference: '', remarks: '' })
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false)
  const load = async () => { try { const [nextItems, nextConfig] = await Promise.all([paymentService.all(filter.status as PaymentRecord['status'] || undefined, filter.studentId ? Number(filter.studentId) : undefined), paymentService.config()]); setItems(nextItems); setConfig(nextConfig); if (nextConfig) setConfigForm({ academic_period: nextConfig.academic_period, total_fee: String(nextConfig.total_fee), due_date: nextConfig.due_date || '' }) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load payment administration.') } }
  useEffect(() => { void load() }, [filter.status, filter.studentId])
  const saveConfig = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await paymentService.saveConfig({ academic_period: configForm.academic_period, total_fee: Number(configForm.total_fee), due_date: configForm.due_date || undefined }); setSuccess('Fee configuration saved.'); await load() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save fee configuration.') } finally { setBusy(false) } }
  const record = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await paymentService.record({ student_id: Number(recordForm.student_id), amount: Number(recordForm.amount), payment_date: recordForm.payment_date, method: recordForm.method as PaymentRecord['method'], reference: recordForm.reference, remarks: recordForm.remarks }); setSuccess('Verified offline payment recorded.'); setRecordForm({ ...recordForm, amount: '', reference: '', remarks: '' }); await load() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to record verified payment.') } finally { setBusy(false) } }
  return <div className="payments-page"><div className="page-header"><div><span className="eyebrow">FINANCE & CONTROL</span><h1>Payments administration</h1><p>Configure fees and record payments only after verification.</p></div></div><Notice error={error} success={success} /><div className="payments-admin-grid"><section className="panel payments-card"><div className="payments-card-heading"><div><span className="eyebrow">FEE CONFIGURATION</span><h2>{config ? 'Current hostel fee' : 'Configure hostel fee'}</h2></div></div><form className="payments-form" onSubmit={saveConfig}><label>Academic period<input required value={configForm.academic_period} onChange={(event) => setConfigForm({ ...configForm, academic_period: event.target.value })} placeholder="2026-27" /></label><label>Total hostel fee<input required type="number" min="0.01" step="0.01" value={configForm.total_fee} onChange={(event) => setConfigForm({ ...configForm, total_fee: event.target.value })} /></label><label>Due date<input type="date" value={configForm.due_date} onChange={(event) => setConfigForm({ ...configForm, due_date: event.target.value })} /></label><button className="button payments-submit" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save fee configuration'}</button></form></section><section className="panel payments-card"><div className="payments-card-heading"><div><span className="eyebrow">OFFLINE PAYMENT</span><h2>Record verified payment</h2></div></div><form className="payments-form" onSubmit={record}><div className="payments-field-grid"><label>Student ID<input required inputMode="numeric" value={recordForm.student_id} onChange={(event) => setRecordForm({ ...recordForm, student_id: event.target.value.replace(/\D/g, '') })} /></label><label>Amount<input required type="number" min="0.01" step="0.01" value={recordForm.amount} onChange={(event) => setRecordForm({ ...recordForm, amount: event.target.value })} /></label><label>Payment date<input required type="date" value={recordForm.payment_date} onChange={(event) => setRecordForm({ ...recordForm, payment_date: event.target.value })} /></label><label>Method<select value={recordForm.method} onChange={(event) => setRecordForm({ ...recordForm, method: event.target.value })}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="UPI">UPI</option><option value="CARD">Card</option></select></label></div><label>Reference<input value={recordForm.reference} onChange={(event) => setRecordForm({ ...recordForm, reference: event.target.value })} /></label><label>Remarks<textarea rows={2} value={recordForm.remarks} onChange={(event) => setRecordForm({ ...recordForm, remarks: event.target.value })} /></label><button className="button payments-submit" type="submit" disabled={busy}>{busy ? 'Recording...' : 'Record verified payment'}</button></form></section></div><section className="panel payments-card"><div className="payments-card-heading"><div><span className="eyebrow">PAYMENT RECORDS</span><h2>Verified offline payments</h2></div><div className="payments-filter"><input placeholder="Student ID" value={filter.studentId} onChange={(event) => setFilter({ ...filter, studentId: event.target.value.replace(/\D/g, '') })} /><select value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}><option value="">All statuses</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option><option value="FAILED">Failed</option></select></div></div>{items.length === 0 ? <div className="payments-empty">No verified payments found.</div> : <div className="payments-table-wrap"><table><thead><tr><th>Student</th><th>Amount</th><th>Date</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.student_id}</td><td>{money(Number(item.amount))}</td><td>{item.payment_date || '-'}</td><td>{methodLabel(item.method)}</td><td>{item.reference || '-'}</td><td><Status>{item.status}</Status></td></tr>)}</tbody></table></div>}</section></div>
}
