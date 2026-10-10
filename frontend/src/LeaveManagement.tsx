import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Check, Eye, Plus, Search, X } from 'lucide-react'

import { leaveService, studentService, type LeaveRecord, type LeaveStatus, type LeaveType, type Student } from './services'
import './operations-management.css'

type LeaveManagementProps = { mode: 'admin' | 'student' }
type LeaveForm = { leave_type: LeaveType; start_date: string; end_date: string; reason: string }

const emptyForm: LeaveForm = { leave_type: 'DAY', start_date: '', end_date: '', reason: '' }
const statusTone = (status: string) => status === 'APPROVED' ? 'mint' : status === 'REJECTED' || status === 'CANCELLED' ? 'coral' : 'amber'
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
const readableStatus = (status: string) => status.replace('_', ' ')

export default function LeaveManagement({ mode }: LeaveManagementProps) {
  return mode === 'admin' ? <AdminLeaves /> : <StudentLeaves />
}

function AdminLeaves() {
  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selected, setSelected] = useState<LeaveRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [leaveRecords, studentRecords] = await Promise.all([leaveService.list(), studentService.list('')])
      setRecords(leaveRecords); setStudents(studentRecords)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => records.filter((record) => {
    const student = students.find((item) => item.id === record.student_id)
    const query = search.toLowerCase().trim()
    const matchesSearch = !query || [record.leave_number, student?.student_id ?? '', student?.full_name ?? ''].some((value) => value.toLowerCase().includes(query))
    return matchesSearch && (!statusFilter || record.status === statusFilter) && (!dateFilter || record.start_date <= dateFilter && record.end_date >= dateFilter)
  }), [dateFilter, records, search, statusFilter, students])

  const decide = async (record: LeaveRecord, decision: 'APPROVED' | 'REJECTED') => {
    const adminNote = decision === 'REJECTED' ? window.prompt('Reason for rejection (optional):') ?? '' : ''
    setActionId(record.id); setError('')
    try { await leaveService.decide(record.id, decision, adminNote); setNotice(`Leave ${record.leave_number} ${decision.toLowerCase()}.`); await load(); setSelected(null) } catch (requestError) { setError(errorMessage(requestError)) } finally { setActionId(null) }
  }

  return <><PageHeader title="Leave requests" copy="Review and decide student leave requests." /><Feedback notice={notice} error={error} clear={() => { setNotice(''); setError('') }} /><section className="panel operations-panel"><div className="operations-toolbar"><div className="operations-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leave number, student ID or name" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | '')}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></select><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></div>{loading ? <OperationEmpty text="Loading leave requests..." /> : visible.length === 0 ? <OperationEmpty text="No leave requests match these filters." /> : <div className="table-wrap"><table className="operations-table"><thead><tr><th>Leave</th><th>Student</th><th>Dates</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((record) => { const student = students.find((item) => item.id === record.student_id); return <tr key={record.id}><td><strong>{record.leave_number}</strong><small>{record.reason}</small></td><td><strong>{student?.full_name ?? `Student #${record.student_id}`}</strong><small>{student?.student_id ?? record.student_id}</small></td><td>{record.start_date} - {record.end_date}</td><td>{record.leave_type.replace('_', ' ')}</td><td><span className={`operation-status ${statusTone(record.status)}`}>{readableStatus(record.status)}</span></td><td><div className="operation-actions"><button className="operation-icon" type="button" onClick={() => setSelected(record)} title="View details" aria-label="View leave details"><Eye size={16} /></button>{record.status === 'PENDING' && <><button className="button compact mint-button" type="button" onClick={() => void decide(record, 'APPROVED')} disabled={actionId === record.id}><Check size={14} /> Approve</button><button className="button compact coral-button" type="button" onClick={() => void decide(record, 'REJECTED')} disabled={actionId === record.id}><X size={14} /> Reject</button></>}</div></td></tr>})}</tbody></table></div>}</section>{selected && <LeaveDetail record={selected} student={students.find((item) => item.id === selected.student_id)} close={() => setSelected(null)} />}</>
}

function StudentLeaves() {
  const [records, setRecords] = useState<LeaveRecord[]>([]); const [form, setForm] = useState(emptyForm); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const load = async () => { setLoading(true); try { setRecords(await leaveService.my()) } catch (requestError) { setError(errorMessage(requestError)) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const update = (field: keyof LeaveForm, value: string) => setForm((previous) => ({ ...previous, [field]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); try { await leaveService.create(form); setNotice('Leave request submitted.'); setOpen(false); setForm(emptyForm); await load() } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) } }
  const cancel = async (record: LeaveRecord) => { if (!window.confirm(`Cancel ${record.leave_number}?`)) return; setSaving(true); try { await leaveService.cancel(record.id); setNotice('Leave request cancelled.'); await load() } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) } }
  return <><PageHeader title="Leave requests" copy="Request time away and keep your plans in view." action={<button className="button" type="button" onClick={() => setOpen(true)}><Plus size={17} /> Request leave</button>} /><Feedback notice={notice} error={error} clear={() => { setNotice(''); setError('') }} /><section className="panel operations-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR REQUESTS</span><h2>Leave history</h2></div></div>{loading ? <OperationEmpty text="Loading your leave requests..." /> : records.length === 0 ? <OperationEmpty text="No leave requests yet." /> : <div className="operation-list">{records.map((record) => <div className="operation-row" key={record.id}><span className="operation-leading"><CalendarDays size={18} /></span><div><strong>{record.leave_type.replace('_', ' ')}</strong><small>{record.leave_number} · {record.start_date} - {record.end_date}</small></div><span className={`operation-status ${statusTone(record.status)}`}>{readableStatus(record.status)}</span>{record.status === 'PENDING' && <button className="operation-icon" type="button" onClick={() => void cancel(record)} disabled={saving} title="Cancel request" aria-label="Cancel leave request"><X size={16} /></button>}</div>)}</div>}</section>{open && <div className="modal-backdrop" onMouseDown={() => !saving && setOpen(false)}><div className="modal operations-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">NEW REQUEST</span><h2>Request leave</h2></div><button type="button" onClick={() => !saving && setOpen(false)} aria-label="Close"><X size={18} /></button></div><form className="operations-form" onSubmit={submit}><label>Leave type<select value={form.leave_type} onChange={(event) => update('leave_type', event.target.value)}><option value="DAY">Day</option><option value="OVERNIGHT">Overnight</option><option value="MULTI_DAY">Multi-day</option></select></label><div className="operations-form-grid"><label>Start date<input type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} required /></label><label>End date<input type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} required /></label></div><label>Reason<textarea value={form.reason} onChange={(event) => update('reason', event.target.value)} placeholder="Reason for your leave" required /></label><button className="button" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit request'}</button></form></div></div>}</>
}

function LeaveDetail({ record, student, close }: { record: LeaveRecord; student?: Student; close: () => void }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal operations-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">LEAVE DETAILS</span><h2>{record.leave_number}</h2></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><div className="operation-detail-grid"><span>Student<strong>{student?.full_name ?? record.student_id}</strong></span><span>Status<strong>{readableStatus(record.status)}</strong></span><span>Type<strong>{record.leave_type.replace('_', ' ')}</strong></span><span>Dates<strong>{record.start_date} - {record.end_date}</strong></span><span>Reason<strong>{record.reason}</strong></span><span>Admin note<strong>{record.admin_note || 'No note'}</strong></span></div></div></div> }

function PageHeader({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">SMARTSTAY OPERATIONS</span><h1>{title}</h1><p>{copy}</p></div>{action}</div> }
function Feedback({ notice, error, clear }: { notice: string; error: string; clear: () => void }) { return <>{notice && <div className="operation-notice" role="status">{notice}<button type="button" onClick={clear} aria-label="Dismiss"><X size={15} /></button></div>}{error && <div className="operation-error" role="alert">{error}</div>}</> }
function OperationEmpty({ text }: { text: string }) { return <div className="operation-empty">{text}</div> }
