import { useEffect, useMemo, useState } from 'react'
import { Check, Search, Save, Users, X } from 'lucide-react'

import { attendanceManagementService, roomService, studentService, type AttendanceStatus, type Room, type Student } from './services'
import './attendance-management.css'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function readableDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function statusLabel(status: AttendanceStatus): string {
  return status === 'PRESENT' ? 'Present' : 'Absent'
}

function blockCode(room: Room | undefined): string {
  return room?.block.replace(/^Block\s+/i, '') ?? ''
}

export default function BulkAttendanceSheet() {
  const [date, setDate] = useState(today)
  const [students, setStudents] = useState<Student[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({})
  const [search, setSearch] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    void Promise.all([studentService.list(''), roomService.list(''), attendanceManagementService.list({ date })]).then(([studentRecords, roomRecords, attendanceRecords]) => {
      if (cancelled) return
      const activeStudents = studentRecords.filter((student) => student.status === 'ACTIVE')
      const existingStatuses = new Map(attendanceRecords.map((record) => [record.student_id, record.status]))
      const initialStatuses = Object.fromEntries(activeStudents.map((student) => [student.id, existingStatuses.get(student.id) ?? 'PRESENT'])) as Record<number, AttendanceStatus>
      setStudents(activeStudents)
      setRooms(roomRecords)
      setStatuses(initialStatuses)
    }).catch((loadError) => {
      if (!cancelled) setError(errorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [date, reloadVersion])

  const blockOptions = [...new Set(rooms.map((room) => blockCode(room)))].sort()
  const floorOptions = [...new Set(rooms.map((room) => room.floor))].sort((first, second) => first - second)
  const roomOptions = useMemo(() => rooms.filter((room) => (!blockFilter || blockCode(room) === blockFilter) && (!floorFilter || String(room.floor) === floorFilter)), [blockFilter, floorFilter, rooms])
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students.filter((student) => {
      const room = rooms.find((record) => record.room_number === student.room_number)
      const matchesBlock = !blockFilter || blockCode(room) === blockFilter
      const matchesFloor = !floorFilter || String(room?.floor ?? '') === floorFilter
      const matchesRoom = !roomFilter || student.room_number === roomFilter
      const matchesSearch = !query || [student.student_id, student.full_name, student.email, student.room_number ?? ''].some((value) => value.toLowerCase().includes(query))
      return matchesBlock && matchesFloor && matchesRoom && matchesSearch
    })
  }, [blockFilter, floorFilter, roomFilter, rooms, search, students])
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / 50))
  const currentPage = Math.min(page, pageCount)
  const pageStudents = filteredStudents.slice((currentPage - 1) * 50, currentPage * 50)
  const presentCount = filteredStudents.filter((student) => statuses[student.id] === 'PRESENT').length
  const absentCount = filteredStudents.length - presentCount

  const markAll = (status: AttendanceStatus) => setStatuses((previous) => ({ ...previous, ...Object.fromEntries(filteredStudents.map((student) => [student.id, status])) }))
  const toggleStatus = (studentId: number) => setStatuses((previous) => ({ ...previous, [studentId]: previous[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT' }))
  const updateDate = (value: string) => { setError(''); setLoading(true); setPage(1); setDate(value) }
  const saveAttendance = async () => {
    if (!filteredStudents.length) return
    setSaving(true)
    setError('')
    try {
      const response = await attendanceManagementService.bulkUpdate({ attendance_date: date, records: filteredStudents.map((student) => ({ student_id: student.id, status: statuses[student.id] ?? 'PRESENT' })) })
      setNotice(`${response.present} present and ${response.absent} absent saved for ${readableDate(date)}.`)
      setLoading(true)
      setReloadVersion((version) => version + 1)
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="page-header"><div><span className="eyebrow">WARDEN WORKSPACE</span><h1>Attendance</h1><p>Mark the daily attendance sheet for active students.</p></div><div className="bulk-attendance-date"><label>Date<input type="date" value={date} onChange={(event) => updateDate(event.target.value)} disabled={loading || saving} /></label></div></div>
    {notice && <div className="attendance-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {error && <div className="attendance-error" role="alert">{error}</div>}
    <section className="panel bulk-attendance-panel"><div className="bulk-attendance-toolbar"><div className="bulk-attendance-summary"><Users size={18} /><strong>{filteredStudents.length}</strong><span>students found</span><span className="bulk-count-present">{presentCount} present</span><span className="bulk-count-absent">{absentCount} absent</span></div><div className="bulk-attendance-actions"><button className="button secondary" type="button" onClick={() => markAll('PRESENT')} disabled={loading || saving || !filteredStudents.length}><Check size={16} /> Mark all present</button><button className="button secondary" type="button" onClick={() => markAll('ABSENT')} disabled={loading || saving || !filteredStudents.length}><X size={16} /> Mark all absent</button><button className="button" type="button" onClick={() => void saveAttendance()} disabled={loading || saving || !filteredStudents.length}>{saving ? 'Saving...' : <><Save size={16} /> Save attendance</>}</button></div></div><div className="bulk-attendance-filters"><label>Block<select value={blockFilter} onChange={(event) => { setBlockFilter(event.target.value); setRoomFilter(''); setPage(1) }} disabled={loading || saving}><option value="">All blocks</option>{blockOptions.map((block) => <option key={block} value={block}>Block {block}</option>)}</select></label><label>Floor<select value={floorFilter} onChange={(event) => { setFloorFilter(event.target.value); setRoomFilter(''); setPage(1) }} disabled={loading || saving}><option value="">All floors</option>{floorOptions.map((floor) => <option key={floor} value={floor}>Floor {floor}</option>)}</select></label><label>Room<select value={roomFilter} onChange={(event) => { setRoomFilter(event.target.value); setPage(1) }} disabled={loading || saving}><option value="">All rooms</option>{roomOptions.map((room) => <option key={room.room_number} value={room.room_number}>{room.room_number}</option>)}</select></label></div><div className="bulk-attendance-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search student ID, name, email or room" aria-label="Search attendance students" /></div>{loading ? <div className="attendance-empty">Loading active students, rooms and attendance...</div> : !students.length ? <div className="attendance-empty">No active students are available for attendance marking.</div> : !filteredStudents.length ? <div className="attendance-empty">No students match the current filters.</div> : <><div className="table-wrap"><table className="bulk-attendance-table"><thead><tr><th>Student ID</th><th>Student name</th><th>Room</th><th>Status</th></tr></thead><tbody>{pageStudents.map((student) => { const status = statuses[student.id] ?? 'PRESENT'; return <tr key={student.id}><td><strong>{student.student_id}</strong></td><td><strong>{student.full_name}</strong><small>{student.email}</small></td><td>{student.room_number ?? 'Unassigned'}</td><td><button className={`attendance-toggle ${status.toLowerCase()}`} type="button" onClick={() => toggleStatus(student.id)} aria-pressed={status === 'PRESENT'} disabled={saving}><span className="attendance-toggle-mark">{status === 'PRESENT' ? <Check size={14} /> : <X size={14} />}</span>{statusLabel(status)}</button></td></tr>})}</tbody></table></div><div className="bulk-attendance-pagination"><span>{(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, filteredStudents.length)} of {filteredStudents.length}</span><button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1 || saving}>Previous</button><span>Page {currentPage} of {pageCount}</span><button className="button secondary" type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount || saving}>Next</button></div></>}</section>
  </>
}

export function LegacyBulkAttendanceSheet() {
  const [date, setDate] = useState(today)
  const [students, setStudents] = useState<Student[]>([])
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      studentService.list(''),
      attendanceManagementService.list({ date }),
    ]).then(([studentRecords, attendanceRecords]) => {
      if (cancelled) return
      const activeStudents = studentRecords.filter((student) => student.status === 'ACTIVE')
      const existingStatuses = new Map(attendanceRecords.map((record) => [record.student_id, record.status]))
      const initialStatuses = Object.fromEntries(activeStudents.map((student) => [student.id, existingStatuses.get(student.id) ?? 'PRESENT'])) as Record<number, AttendanceStatus>
      setStudents(activeStudents)
      setStatuses(initialStatuses)
    }).catch((loadError) => {
      if (!cancelled) setError(errorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [date, reloadVersion])

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return students
    return students.filter((student) => [student.student_id, student.full_name, student.email, student.room_number ?? ''].some((value) => value.toLowerCase().includes(query)))
  }, [search, students])

  const presentCount = students.filter((student) => statuses[student.id] === 'PRESENT').length
  const absentCount = students.length - presentCount

  const markAll = (status: AttendanceStatus) => {
    setStatuses(Object.fromEntries(students.map((student) => [student.id, status])))
  }

  const toggleStatus = (studentId: number) => {
    setStatuses((previous) => ({ ...previous, [studentId]: previous[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT' }))
  }

  const saveAttendance = async () => {
    if (students.length === 0) return
    setSaving(true)
    setError('')
    try {
      await attendanceManagementService.bulkUpdate({
        attendance_date: date,
        records: students.map((student) => ({ student_id: student.id, status: statuses[student.id] ?? 'PRESENT' })),
      })
      setNotice(`${presentCount} present and ${absentCount} absent saved for ${readableDate(date)}.`)
      setLoading(true)
      setReloadVersion((version) => version + 1)
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="page-header"><div><span className="eyebrow">WARDEN WORKSPACE</span><h1>Attendance</h1><p>Mark the daily attendance sheet for active students.</p></div><div className="bulk-attendance-date"><label>Date<input type="date" value={date} onChange={(event) => { setError(''); setLoading(true); setDate(event.target.value) }} disabled={loading || saving} /></label></div></div>
    {notice && <div className="attendance-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    {error && <div className="attendance-error" role="alert">{error}</div>}
    <section className="panel bulk-attendance-panel"><div className="bulk-attendance-toolbar"><div className="bulk-attendance-summary"><Users size={18} /><strong>{students.length}</strong><span>active students</span><span className="bulk-count-present">{presentCount} present</span><span className="bulk-count-absent">{absentCount} absent</span></div><div className="bulk-attendance-actions"><button className="button secondary" type="button" onClick={() => markAll('PRESENT')} disabled={loading || saving || students.length === 0}><Check size={16} /> Mark all present</button><button className="button secondary" type="button" onClick={() => markAll('ABSENT')} disabled={loading || saving || students.length === 0}><X size={16} /> Mark all absent</button><button className="button" type="button" onClick={() => void saveAttendance()} disabled={loading || saving || students.length === 0}>{saving ? 'Saving...' : <><Save size={16} /> Save attendance</>}</button></div></div><div className="bulk-attendance-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student ID, name, email or room" aria-label="Search attendance students" /></div>{loading ? <div className="attendance-empty">Loading active students and attendance...</div> : students.length === 0 ? <div className="attendance-empty">No active students are available for attendance marking.</div> : visibleStudents.length === 0 ? <div className="attendance-empty">No students match your search.</div> : <div className="table-wrap"><table className="bulk-attendance-table"><thead><tr><th>Student ID</th><th>Student name</th><th>Room</th><th>Status</th></tr></thead><tbody>{visibleStudents.map((student) => { const status = statuses[student.id] ?? 'PRESENT'; return <tr key={student.id}><td><strong>{student.student_id}</strong></td><td><strong>{student.full_name}</strong><small>{student.email}</small></td><td>{student.room_number ?? 'Unassigned'}</td><td><button className={`attendance-toggle ${status.toLowerCase()}`} type="button" onClick={() => toggleStatus(student.id)} aria-pressed={status === 'PRESENT'} disabled={saving}><span className="attendance-toggle-mark">{status === 'PRESENT' ? <Check size={14} /> : <X size={14} />}</span>{statusLabel(status)}</button></td></tr>})}</tbody></table></div>}</section>
  </>
}
