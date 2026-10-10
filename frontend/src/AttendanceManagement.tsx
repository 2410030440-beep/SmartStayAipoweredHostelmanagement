import { useEffect, useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, RefreshCw, X } from 'lucide-react'

import {
  attendanceManagementService,
  studentService,
  type Attendance,
  type AttendanceStatus,
  type AttendanceSummary,
  type Student,
} from './services'
import BulkAttendanceSheet from './BulkAttendanceSheet'
import './attendance-management.css'

type AttendanceManagementProps = {
  mode: 'admin' | 'student'
}

type AttendanceForm = {
  studentId: string
  date: string
  status: AttendanceStatus
}

const emptyForm = (): AttendanceForm => ({
  studentId: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'PRESENT',
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function statusLabel(status: AttendanceStatus): string {
  return status === 'PRESENT' ? 'Present' : 'Absent'
}

function studentName(studentId: number, students: Student[]): string {
  const student = students.find((record) => record.id === studentId)
  return student ? `${student.full_name} (${student.student_id})` : `Student #${studentId}`
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`attendance-status ${status.toLowerCase()}`}>{statusLabel(status)}</span>
}

export default function AttendanceManagement({ mode }: AttendanceManagementProps) {
  return mode === 'admin' ? <BulkAttendanceSheet /> : <StudentAttendance />
}

export function AdminAttendance() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentFilter, setStudentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('')
  const [form, setForm] = useState<AttendanceForm>(emptyForm)
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const nextRecords = await attendanceManagementService.list({
        studentId: studentFilter ? Number(studentFilter) : undefined,
        date: dateFilter || undefined,
        status: statusFilter || undefined,
      })
      setRecords(nextRecords)
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all([attendanceManagementService.list(), studentService.list('')]).then(([attendanceRecords, studentRecords]) => {
      if (!cancelled) {
        setRecords(attendanceRecords)
        setStudents(studentRecords)
      }
    }).catch((loadError) => {
      if (!cancelled) setError(errorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updateForm = (field: keyof AttendanceForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.studentId || !form.date) {
      setError('Select a student and attendance date before saving.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await attendanceManagementService.create({
        student_id: Number(form.studentId),
        attendance_date: form.date,
        status: form.status,
      })
      setForm(emptyForm())
      setNotice('Attendance marked successfully.')
      await loadRecords()
    } catch (createError) {
      setError(errorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (record: Attendance) => {
    setEditingRecord(record)
    setForm({ studentId: String(record.student_id), date: record.attendance_date, status: record.status })
    setError('')
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingRecord || !form.date) return
    setSaving(true)
    setError('')
    try {
      await attendanceManagementService.update(editingRecord.id, { attendance_date: form.date, status: form.status })
      setEditingRecord(null)
      setForm(emptyForm())
      setNotice('Attendance updated successfully.')
      await loadRecords()
    } catch (updateError) {
      setError(errorMessage(updateError))
    } finally {
      setSaving(false)
    }
  }

  const clearFilters = () => {
    setStudentFilter('')
    setDateFilter('')
    setStatusFilter('')
    void attendanceManagementService.list().then(setRecords).catch((loadError) => setError(errorMessage(loadError)))
  }

  return <>
    <div className="page-header"><div><span className="eyebrow">WARDEN WORKSPACE</span><h1>Attendance</h1><p>Record and review attendance from the live student register.</p></div><button className="button secondary" type="button" onClick={() => void loadRecords()} disabled={loading}><RefreshCw size={16} /> Refresh</button></div>
    {notice && <div className="attendance-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {error && <div className="attendance-error" role="alert">{error}</div>}
    <section className="panel attendance-form-panel"><div className="panel-heading"><div><span className="eyebrow">NEW RECORD</span><h2>Mark attendance</h2></div><Plus size={19} /></div><form className="attendance-form" onSubmit={handleCreate}><label>Student<select value={form.studentId} onChange={(event) => updateForm('studentId', event.target.value)} required><option value="">Select a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_id} · {student.full_name} · {student.email}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} required /></label><label>Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value as AttendanceStatus)}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></label><button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Mark attendance'}</button></form></section>
    <section className="panel attendance-table-panel"><div className="panel-heading"><div><span className="eyebrow">ATTENDANCE RECORDS</span><h2>{records.length} {records.length === 1 ? 'record' : 'records'}</h2></div></div><div className="attendance-filters"><label>Student<select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}><option value="">All students</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_id} · {student.full_name}</option>)}</select></label><label>Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | '')}><option value="">All statuses</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></label><button className="button secondary attendance-filter-button" type="button" onClick={() => void loadRecords()} disabled={loading}>Apply filters</button><button className="button secondary attendance-filter-button" type="button" onClick={clearFilters}>Clear</button></div>{loading ? <div className="attendance-empty">Loading attendance records...</div> : records.length === 0 ? <div className="attendance-empty">No attendance records match the current filters.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.attendance_date}</td><td><strong>{studentName(record.student_id, students)}</strong></td><td><AttendanceStatusBadge status={record.status} /></td><td><button className="attendance-icon-button" type="button" onClick={() => openEdit(record)} aria-label={`Edit attendance for ${studentName(record.student_id, students)}`} title="Edit attendance"><Pencil size={16} /></button></td></tr>)}</tbody></table></div>}</section>
    {editingRecord && <div className="modal-backdrop" onMouseDown={() => { if (!saving) setEditingRecord(null) }}><div className="modal attendance-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">EDIT RECORD</span><h2>Update attendance</h2></div><button type="button" onClick={() => { if (!saving) setEditingRecord(null) }} aria-label="Close edit form"><X size={18} /></button></div><p className="attendance-edit-student">{studentName(editingRecord.student_id, students)}</p><form className="attendance-form attendance-edit-form" onSubmit={handleUpdate}><label>Date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} required /></label><label>Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value as AttendanceStatus)}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></label><div className="room-form-actions"><button className="button secondary" type="button" onClick={() => setEditingRecord(null)} disabled={saving}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update attendance'}</button></div></form></div></div>}
  </>
}

function StudentAttendance() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void Promise.all([attendanceManagementService.my(), attendanceManagementService.mySummary()]).then(([attendanceRecords, attendanceSummary]) => {
      if (!cancelled) {
        setRecords(attendanceRecords)
        setSummary(attendanceSummary)
      }
    }).catch((loadError) => {
      if (!cancelled) setError(errorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <><div className="page-header"><div><span className="eyebrow">YOUR PRESENCE</span><h1>Attendance</h1><p>View the attendance records linked to your student account.</p></div><Check size={23} /></div>{error && <div className="attendance-error" role="alert">{error}</div>}{loading ? <div className="attendance-empty">Loading your attendance...</div> : <><div className="attendance-summary-grid"><SummaryCard label="Attendance" value={`${summary?.attendance_percentage ?? 0}%`} tone="mint" /><SummaryCard label="Total days" value={String(summary?.total_days ?? 0)} tone="blue" /><SummaryCard label="Present days" value={String(summary?.present_days ?? 0)} tone="mint" /><SummaryCard label="Absent days" value={String(summary?.absent_days ?? 0)} tone="coral" /></div><section className="panel attendance-table-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RECORDS</span><h2>Attendance history</h2></div></div>{records.length === 0 ? <div className="attendance-empty">No attendance records are available yet.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.attendance_date}</td><td><AttendanceStatusBadge status={record.status} /></td></tr>)}</tbody></table></div>}</section></>}</>
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`attendance-summary-card ${tone}`}><span>{label}</span><strong>{value}</strong></div>
}
