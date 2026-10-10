import { useEffect, useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, Search, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'

import { getCurrentUser, roomService, studentService, type Room, type RoomInput, type RoomStatus, type Student } from './services'
import './room-management.css'

type RoomManagementProps = {
  mode: 'admin' | 'student'
}

type RoomForm = {
  room_number: string
  block: string
  floor: string
  room_type: string
  capacity: string
  status: RoomStatus
}

const emptyForm: RoomForm = {
  room_number: '',
  block: '',
  floor: '0',
  room_type: '',
  capacity: '1',
  status: 'AVAILABLE',
}

function formFromRoom(room: Room): RoomForm {
  return {
    room_number: room.room_number,
    block: room.block,
    floor: String(room.floor),
    room_type: room.room_type,
    capacity: String(room.capacity),
    status: room.status,
  }
}

function requestError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return message.includes('Cannot delete a room with assigned students')
    ? 'This room cannot be deleted while students are assigned to it.'
    : message
}

function roomInput(form: RoomForm): RoomInput {
  return {
    room_number: form.room_number.trim(),
    block: form.block.trim(),
    floor: Number(form.floor),
    room_type: form.room_type.trim(),
    capacity: Number(form.capacity),
    status: form.status,
  }
}

export default function RoomManagement({ mode }: RoomManagementProps) {
  const isAdmin = mode === 'admin'
  const [rooms, setRooms] = useState<Room[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentRoom, setStudentRoom] = useState<Room | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [allocationOpen, setAllocationOpen] = useState(false)
  const [allocationMode, setAllocationMode] = useState<'allocate' | 'deallocate'>('allocate')
  const [allocationStudentId, setAllocationStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRooms = async (query = search, filter = statusFilter) => {
    setLoading(true)
    setError('')
    try {
      setRooms(await roomService.list(query, filter || undefined))
    } catch (loadError) {
      setError(requestError(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (isAdmin) {
      void roomService.list('').then((records) => {
        if (!cancelled) setRooms(records)
      }).catch((loadError) => {
        if (!cancelled) setError(requestError(loadError))
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    } else {
      void getCurrentUser().then(async (currentUser) => {
        const records = await studentService.list(currentUser.email)
        const currentStudent = records.find((record) => record.email.toLowerCase() === currentUser.email.toLowerCase())
        return currentStudent?.room_number ? roomService.get(currentStudent.room_number) : null
      }).then((assignedRoom) => {
        if (!cancelled) setStudentRoom(assignedRoom)
      }).catch((loadError) => {
        if (!cancelled) setError(requestError(loadError))
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    }
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadRooms()
  }

  const handleField = (field: keyof RoomForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const openCreate = () => {
    setSelectedRoom(null)
    setForm(emptyForm)
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const openEdit = (room: Room) => {
    setSelectedRoom(room)
    setForm(formFromRoom(room))
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = roomInput(form)
    if (!input.room_number || !input.block || !input.room_type || !Number.isInteger(input.floor) || input.floor < 0 || !Number.isInteger(input.capacity) || input.capacity < 1) {
      setError('Enter a room number, block, non-negative floor, room type, and capacity of at least one bed.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (selectedRoom) {
        const updated = await roomService.update(selectedRoom.room_number, { block: input.block, floor: input.floor, room_type: input.room_type, capacity: input.capacity, status: input.status })
        setNotice('Room updated successfully.')
        setSelectedRoom(updated)
      } else {
        await roomService.create(input)
        setNotice('Room added successfully.')
      }
      setFormOpen(false)
      await loadRooms()
    } catch (saveError) {
      setError(requestError(saveError))
    } finally {
      setSaving(false)
    }
  }

  const handleView = async (room: Room) => {
    setError('')
    try {
      const [roomRecord, studentRecords] = await Promise.all([
        roomService.get(room.room_number),
        studentService.list(''),
      ])
      setSelectedRoom(roomRecord)
      setStudents(studentRecords)
      setDetailsOpen(true)
    } catch (viewError) {
      setError(requestError(viewError))
    }
  }

  const handleDelete = async (room: Room) => {
    if (!window.confirm(`Delete room ${room.room_number}? This cannot be undone.`)) return
    setActionLoading(true)
    setError('')
    try {
      await roomService.remove(room.room_number)
      setNotice('Room deleted successfully.')
      await loadRooms()
    } catch (deleteError) {
      setError(requestError(deleteError))
    } finally {
      setActionLoading(false)
    }
  }

  const openAllocation = async (room: Room, allocation: 'allocate' | 'deallocate') => {
    setSelectedRoom(room)
    setAllocationMode(allocation)
    setAllocationStudentId('')
    setError('')
    try {
      setStudents(await studentService.list(''))
      setAllocationOpen(true)
    } catch (studentError) {
      setError(requestError(studentError))
    }
  }

  const handleAllocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRoom || !allocationStudentId) {
      setError('Select a student before continuing.')
      return
    }
    if (allocationMode === 'deallocate' && !window.confirm(`Deallocate this student from room ${selectedRoom.room_number}?`)) return
    setActionLoading(true)
    setError('')
    try {
      const updatedRoom = allocationMode === 'allocate'
        ? await roomService.allocate(selectedRoom.room_number, allocationStudentId)
        : await roomService.deallocate(selectedRoom.room_number, allocationStudentId)
      const [roomRecord, studentRecords] = await Promise.all([
        roomService.get(updatedRoom.room_number),
        studentService.list(''),
      ])
      setSelectedRoom(roomRecord)
      setStudents(studentRecords)
      setNotice(allocationMode === 'allocate' ? 'Student allocated successfully.' : 'Student deallocated successfully.')
      setAllocationOpen(false)
      await loadRooms()
      setDetailsOpen(true)
    } catch (allocationError) {
      setError(requestError(allocationError))
    } finally {
      setActionLoading(false)
    }
  }

  if (!isAdmin) return <StudentRoomView room={studentRoom} loading={loading} error={error} />

  return <>
    <RoomPageHeader onAdd={openCreate} />
    {notice && <div className="room-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {error && <div className="room-error" role="alert">{error}</div>}
    <section className="panel room-management-panel">
      <div className="room-toolbar"><form className="room-search" onSubmit={handleSearch}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search room number, block or type" aria-label="Search rooms" /><button className="button secondary" type="submit" disabled={loading}>Search</button></form><select className="room-filter" value={statusFilter} onChange={(event) => { const filter = event.target.value as RoomStatus | ''; setStatusFilter(filter); void loadRooms(search, filter) }} aria-label="Filter by room status"><option value="">All statuses</option><option value="AVAILABLE">Available</option><option value="PARTIALLY_OCCUPIED">Partially occupied</option><option value="FULL">Full</option><option value="MAINTENANCE">Maintenance</option></select><span className="room-count">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span></div>
      {loading ? <div className="room-loading">Loading room records...</div> : rooms.length === 0 ? <div className="room-empty"><RoomIcon /><h2>No rooms found</h2><p>Add a room or adjust your search and filters.</p></div> : <div className="table-wrap room-table-wrap"><table className="room-table"><thead><tr><th>Room number</th><th>Block</th><th>Floor</th><th>Room type</th><th>Occupied / Capacity</th><th>Available beds</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.room_number}><td><strong>{room.room_number}</strong></td><td>{room.block}</td><td>{room.floor}</td><td>{room.room_type}</td><td>{room.occupied_beds} / {room.capacity}</td><td>{room.available_beds}</td><td><RoomStatusBadge status={room.status} /></td><td><div className="room-actions"><button onClick={() => void handleView(room)} title="View room" aria-label={`View room ${room.room_number}`}><Eye size={16} /></button><button onClick={() => openEdit(room)} title="Edit room" aria-label={`Edit room ${room.room_number}`}><Pencil size={16} /></button><button onClick={() => void openAllocation(room, 'allocate')} title="Allocate student" aria-label={`Allocate student to ${room.room_number}`} disabled={room.status === 'FULL' || room.status === 'MAINTENANCE'}><UserPlus size={16} /></button><button onClick={() => void openAllocation(room, 'deallocate')} title="Deallocate student" aria-label={`Deallocate student from ${room.room_number}`} disabled={room.occupied_beds === 0}><UserMinus size={16} /></button><button onClick={() => void handleDelete(room)} title="Delete room" aria-label={`Delete room ${room.room_number}`} disabled={actionLoading}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {formOpen && <RoomForm form={form} editing={Boolean(selectedRoom)} saving={saving} onChange={handleField} onSubmit={handleSubmit} close={() => { if (!saving) setFormOpen(false) }} />}
    {detailsOpen && selectedRoom && <RoomDetails room={selectedRoom} students={students} actionLoading={actionLoading} onDeallocate={(studentId) => { setAllocationMode('deallocate'); setAllocationStudentId(studentId); setDetailsOpen(false); setAllocationOpen(true) }} close={() => setDetailsOpen(false)} />}
    {allocationOpen && selectedRoom && <AllocationForm room={selectedRoom} mode={allocationMode} students={students} selectedStudentId={allocationStudentId} saving={actionLoading} onChange={setAllocationStudentId} onSubmit={handleAllocation} close={() => { if (!actionLoading) setAllocationOpen(false) }} />}
  </>
}

function RoomPageHeader({ onAdd }: { onAdd: () => void }) {
  return <div className="page-header"><div><span className="eyebrow">WARDEN WORKSPACE</span><h1>Rooms</h1><p>Manage room capacity, occupancy and student allocations.</p></div><button className="button" onClick={onAdd}><Plus size={17} /> Add room</button></div>
}

function StudentRoomView({ room, loading, error }: { room: Room | null; loading: boolean; error: string }) {
  return <><div className="page-header"><div><span className="eyebrow">YOUR HOSTEL ROOM</span><h1>My room</h1><p>View the room information assigned to your student record.</p></div></div>{error && <div className="room-error" role="alert">{error}</div>}{loading ? <div className="room-loading">Loading your room...</div> : room ? <RoomDetailsContent room={room} /> : <section className="panel room-empty"><RoomIcon /><h2>No room assigned</h2><p>No room has been assigned yet.</p></section>}</>
}

function RoomDetailsContent({ room }: { room: Room }) {
  return <section className="room-detail-card"><div className="room-detail-heading"><div><span className="eyebrow">ROOM {room.room_number}</span><h2>{room.block} · Floor {room.floor}</h2></div><RoomStatusBadge status={room.status} /></div><div className="room-metrics"><div><small>Room type</small><strong>{room.room_type}</strong></div><div><small>Occupied beds</small><strong>{room.occupied_beds} / {room.capacity}</strong></div><div><small>Available beds</small><strong>{room.available_beds}</strong></div></div></section>
}

function RoomDetails({ room, students, actionLoading, onDeallocate, close }: { room: Room; students: Student[]; actionLoading: boolean; onDeallocate: (studentId: string) => void; close: () => void }) {
  const assignedStudents = students.filter((student) => student.room_number === room.room_number)
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal room-details-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ROOM DETAILS</span><h2>{room.room_number}</h2></div><button onClick={close} aria-label="Close details"><X size={18} /></button></div><RoomDetailsContent room={room} /><div className="room-assigned-students"><div className="room-assigned-heading"><h3>Assigned students</h3><span>{assignedStudents.length} assigned</span></div>{assignedStudents.length === 0 ? <p className="room-form-help">No students are currently assigned to this room.</p> : assignedStudents.map((student) => <div className="room-assigned-student" key={student.student_id}><div><strong>{student.full_name}</strong><small>{student.student_id} · {student.email}</small></div><button className="button secondary" type="button" onClick={() => onDeallocate(student.student_id)} disabled={actionLoading}><UserMinus size={15} /> Deallocate</button></div>)}</div></div></div>
}

function RoomForm({ form, editing, saving, onChange, onSubmit, close }: { form: RoomForm; editing: boolean; saving: boolean; onChange: (field: keyof RoomForm, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; close: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal room-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{editing ? 'EDIT ROOM' : 'NEW ROOM'}</span><h2>{editing ? 'Edit room' : 'Add room'}</h2></div><button onClick={close} aria-label="Close form"><X size={18} /></button></div><form className="room-form" onSubmit={onSubmit} noValidate><div className="room-form-grid"><FormField label="Room number" value={form.room_number} required disabled={editing} onChange={(value) => onChange('room_number', value)} /><FormField label="Block" value={form.block} required onChange={(value) => onChange('block', value)} /><FormField label="Floor" type="number" value={form.floor} required onChange={(value) => onChange('floor', value)} /><FormField label="Room type" value={form.room_type} required onChange={(value) => onChange('room_type', value)} /><FormField label="Capacity" type="number" value={form.capacity} required onChange={(value) => onChange('capacity', value)} /><label>Status<select value={form.status} onChange={(event) => onChange('status', event.target.value)}><option value="AVAILABLE">Available</option><option value="PARTIALLY_OCCUPIED">Partially occupied</option><option value="FULL">Full</option><option value="MAINTENANCE">Maintenance</option></select></label></div><p className="room-form-help">Occupancy and status are validated and maintained by the backend.</p><div className="room-form-actions"><button className="button secondary" type="button" onClick={close} disabled={saving}>Cancel</button><button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add room'}</button></div></form></div></div>
}

function FormField({ label, value, type = 'text', required = false, disabled = false, onChange }: { label: string; value: string; type?: string; required?: boolean; disabled?: boolean; onChange: (value: string) => void }) {
  return <label>{label}{required && <span className="required-mark"> *</span>}<input type={type} value={value} required={required} disabled={disabled} min={type === 'number' ? '0' : undefined} onChange={(event) => onChange(event.target.value)} /></label>
}

function AllocationForm({ room, mode, students, selectedStudentId, saving, onChange, onSubmit, close }: { room: Room; mode: 'allocate' | 'deallocate'; students: Student[]; selectedStudentId: string; saving: boolean; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; close: () => void }) {
  const eligibleStudents = mode === 'allocate' ? students.filter((student) => !student.room_number) : students.filter((student) => student.room_number === room.room_number)
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal allocation-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{mode === 'allocate' ? 'ROOM ALLOCATION' : 'ROOM DE-ALLOCATION'}</span><h2>{mode === 'allocate' ? `Allocate to ${room.room_number}` : `Deallocate from ${room.room_number}`}</h2></div><button onClick={close} aria-label="Close allocation form"><X size={18} /></button></div><form className="room-form" onSubmit={onSubmit}><label>Student<select value={selectedStudentId} onChange={(event) => onChange(event.target.value)} required><option value="">Select a student</option>{eligibleStudents.map((student) => <option key={student.student_id} value={student.student_id}>{student.student_id} · {student.full_name} · {student.email} · Room: {student.room_number ?? 'Unassigned'}</option>)}</select></label>{eligibleStudents.length === 0 && <p className="room-form-help">No eligible students are available for this action.</p>}<div className="room-form-actions"><button className="button secondary" type="button" onClick={close} disabled={saving}>Cancel</button><button className="button" type="submit" disabled={saving || eligibleStudents.length === 0}>{saving ? 'Updating...' : mode === 'allocate' ? 'Allocate student' : 'Deallocate student'}</button></div></form></div></div>
}

function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <span className={`room-status ${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
}

function RoomIcon() {
  return <div className="room-empty-icon"><Users size={22} /></div>
}
