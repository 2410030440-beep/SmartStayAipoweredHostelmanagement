import { useEffect, useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { studentService, type Student, type StudentInput } from './services'
import './student-management.css'

type StudentManagementProps = {
  mode: 'admin' | 'student'
}

type FormState = {
  student_id: string
  full_name: string
  email: string
  phone: string
  course: string
  year: string
  gender: string
  room_number: string
  status: Student['status']
}

const emptyForm: FormState = {
  student_id: '',
  full_name: '',
  email: '',
  phone: '',
  course: '',
  year: '',
  gender: '',
  room_number: '',
  status: 'ACTIVE',
}

function formFromStudent(student: Student): FormState {
  return {
    student_id: student.student_id,
    full_name: student.full_name,
    email: student.email,
    phone: student.phone,
    course: student.course,
    year: student.year,
    gender: student.gender,
    room_number: student.room_number ?? '',
    status: student.status,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function StudentManagement({ mode }: StudentManagementProps) {
  const isAdmin = mode === 'admin'
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudents = async (query = search) => {
    setLoading(true)
    setError('')
    try {
      const records = await studentService.list(query)
      setStudents(records)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void studentService.list('').then((records) => {
      if (!cancelled) setStudents(records)
    }).catch((requestError) => {
      if (!cancelled) setError(errorMessage(requestError))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadStudents()
  }

  const openCreate = () => {
    setSelectedStudent(null)
    setForm(emptyForm)
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const openEdit = (student: Student) => {
    setSelectedStudent(student)
    setForm(formFromStudent(student))
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!saving) setFormOpen(false)
  }

  const handleField = (field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.student_id.trim() || !form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.course.trim() || !form.year.trim() || !form.gender.trim()) {
      setError('Complete all required fields before saving.')
      return
    }

    const input: StudentInput = {
      student_id: form.student_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      course: form.course.trim(),
      year: form.year.trim(),
      gender: form.gender.trim(),
      room_number: form.room_number.trim() || null,
      status: form.status,
    }

    setSaving(true)
    setError('')
    try {
      if (selectedStudent) {
        await studentService.update(selectedStudent.student_id, input)
        setNotice('Student updated successfully.')
      } else {
        await studentService.create(input)
        setNotice('Student added successfully.')
      }
      setFormOpen(false)
      await loadStudents()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Delete ${student.full_name}? This cannot be undone.`)) return
    setDeletingId(student.student_id)
    setError('')
    try {
      await studentService.remove(student.student_id)
      setNotice('Student deleted successfully.')
      await loadStudents()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setDeletingId(null)
    }
  }

  return <>
    <PageHeader mode={mode} onAdd={openCreate} />
    {notice && <div className="student-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {error && <div className="student-error" role="alert">{error}</div>}
    <section className="panel student-management-panel">
      <div className="student-toolbar">
        <form className="student-search" onSubmit={handleSearch}>
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by ID, name, email or course" aria-label="Search students" />
          <button className="button secondary" type="submit" disabled={loading}>Search</button>
        </form>
        <span className="student-count">{students.length} {students.length === 1 ? 'student' : 'students'}</span>
      </div>
      {loading ? <div className="student-loading">Loading student records...</div> : students.length === 0 ? <div className="student-empty"><UsersIcon /><h2>{isAdmin ? 'No students found' : 'No student record found'}</h2><p>{isAdmin ? 'Add the first student or adjust your search.' : 'Your student record is not available yet.'}</p></div> : <div className="table-wrap student-table-wrap"><table className="student-table"><thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>Year</th><th>Gender</th><th>Room</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead><tbody>{students.map((student) => <tr key={student.student_id}><td><strong>{student.student_id}</strong></td><td>{student.full_name}</td><td>{student.email}</td><td>{student.phone}</td><td>{student.course}</td><td>{student.year}</td><td>{student.gender}</td><td>{student.room_number ?? 'Unassigned'}</td><td><span className={`student-status ${student.status.toLowerCase()}`}>{student.status.replace('_', ' ')}</span></td>{isAdmin && <td><div className="student-actions"><button onClick={() => setSelectedStudent(student)} title="View student" aria-label={`View ${student.full_name}`}><Eye size={16} /></button><button onClick={() => openEdit(student)} title="Edit student" aria-label={`Edit ${student.full_name}`}><Pencil size={16} /></button><button onClick={() => void handleDelete(student)} title="Delete student" aria-label={`Delete ${student.full_name}`} disabled={deletingId === student.student_id}><Trash2 size={16} /></button></div></td>}</tr>)}</tbody></table></div>}
    </section>
    {selectedStudent && !formOpen && <StudentDetails student={selectedStudent} close={() => setSelectedStudent(null)} canEdit={isAdmin} onEdit={() => openEdit(selectedStudent)} />}
    {formOpen && <StudentForm form={form} editing={Boolean(selectedStudent)} saving={saving} onChange={handleField} onSubmit={handleSubmit} close={closeForm} />}
  </>
}

function PageHeader({ mode, onAdd }: { mode: 'admin' | 'student'; onAdd: () => void }) {
  return <div className="page-header"><div><span className="eyebrow">{mode === 'admin' ? 'STUDENT ADMINISTRATION' : 'YOUR STUDENT RECORD'}</span><h1>{mode === 'admin' ? 'Students' : 'My student record'}</h1><p>{mode === 'admin' ? 'Manage student profiles, rooms and enrollment details.' : 'View the student information linked to your account.'}</p></div>{mode === 'admin' && <button className="button" onClick={onAdd}><Plus size={17} /> Add student</button>}</div>
}

function StudentForm({ form, editing, saving, onChange, onSubmit, close }: { form: FormState; editing: boolean; saving: boolean; onChange: (field: keyof FormState, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; close: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal student-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{editing ? 'EDIT RECORD' : 'NEW RECORD'}</span><h2>{editing ? 'Edit student' : 'Add student'}</h2></div><button onClick={close} aria-label="Close form"><X size={18} /></button></div><form className="student-form" onSubmit={onSubmit} noValidate><div className="student-form-grid"><FormField label="Student ID" value={form.student_id} required disabled={editing} onChange={(value) => onChange('student_id', value)} /><FormField label="Full name" value={form.full_name} required onChange={(value) => onChange('full_name', value)} /><FormField label="Email" type="email" value={form.email} required onChange={(value) => onChange('email', value)} /><FormField label="Phone" value={form.phone} required onChange={(value) => onChange('phone', value)} /><FormField label="Course" value={form.course} required onChange={(value) => onChange('course', value)} /><FormField label="Year" value={form.year} required onChange={(value) => onChange('year', value)} /><FormField label="Gender" value={form.gender} required onChange={(value) => onChange('gender', value)} /><FormField label="Room number" value={form.room_number} onChange={(value) => onChange('room_number', value)} /><label>Status<select value={form.status} onChange={(event) => onChange('status', event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ON_LEAVE">On leave</option></select></label></div><div className="student-form-actions"><button className="button secondary" type="button" onClick={close} disabled={saving}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add student'}</button></div></form></div></div>
}

function FormField({ label, value, type = 'text', required = false, disabled = false, onChange }: { label: string; value: string; type?: string; required?: boolean; disabled?: boolean; onChange: (value: string) => void }) {
  return <label>{label}{required && <span className="required-mark"> *</span>}<input type={type} value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>
}

function StudentDetails({ student, close, canEdit, onEdit }: { student: Student; close: () => void; canEdit: boolean; onEdit: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal student-details" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">STUDENT DETAILS</span><h2>{student.full_name}</h2></div><button onClick={close} aria-label="Close details"><X size={18} /></button></div><div className="student-detail-grid">{[['Student ID', student.student_id], ['Email', student.email], ['Phone', student.phone], ['Course', student.course], ['Year', student.year], ['Gender', student.gender], ['Room number', student.room_number ?? 'Unassigned'], ['Status', student.status.replace('_', ' ')]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>{canEdit && <div className="student-form-actions"><button className="button" onClick={onEdit}><Pencil size={16} /> Edit student</button></div>}</div></div>
}

function UsersIcon() {
  return <div className="student-empty-icon"><Eye size={22} /></div>
}
