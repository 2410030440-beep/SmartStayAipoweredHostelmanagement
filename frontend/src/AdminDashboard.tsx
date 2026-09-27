import { useEffect, useState } from 'react'
import { ArrowRight, BedDouble, LogOut, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { getAuthToken, getCurrentUser, logoutUser, roomService, studentService, type AuthUser, type Room, type Student } from './services'
import './admin-dashboard.css'

type DashboardData = {
  students: Student[]
  rooms: Room[]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<DashboardData>({ students: [], rooms: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadDashboard = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser.role !== 'ADMIN') {
          navigate('/student', { replace: true })
          return
        }
        const [students, rooms] = await Promise.all([studentService.list(), roomService.list()])
        if (!cancelled) {
          setUser(currentUser)
          setData({ students, rooms })
        }
      } catch (requestError) {
        if (!cancelled) {
          if (!getAuthToken()) {
            logoutUser()
            navigate('/admin-login', { replace: true })
          } else {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load the admin dashboard.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadDashboard()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const logout = () => {
    logoutUser()
    navigate('/admin-login', { replace: true })
  }

  const totalCapacity = data.rooms.reduce((total, room) => total + room.capacity, 0)
  const occupiedBeds = data.rooms.reduce((total, room) => total + room.occupied_beds, 0)
  const availableBeds = data.rooms.reduce((total, room) => total + room.available_beds, 0)

  if (loading) return <DashboardState message="Loading your admin dashboard..." />

  return <>
    <section className="admin-dashboard-head"><div><span className="eyebrow">SMARTSTAY ADMINISTRATION</span><h1>Admin Dashboard</h1><p>{user?.name} · {user?.email}</p></div><button className="button secondary admin-logout" onClick={logout}><LogOut size={16} /> Logout</button></section>
    {error && <div className="admin-dashboard-error" role="alert">{error}<button onClick={() => window.location.reload()}>Retry</button></div>}
    <div className="admin-summary-grid"><SummaryCard label="Total Students" value={String(data.students.length)} note="From Student Management" icon={<Users size={19} />} tone="blue" /><SummaryCard label="Total Rooms" value={String(data.rooms.length)} note="Live room inventory" icon={<BedDouble size={19} />} tone="mint" /><SummaryCard label="Occupied Beds" value={String(occupiedBeds)} note={`Across ${totalCapacity} total beds`} icon={<Users size={19} />} tone="amber" /><SummaryCard label="Available Beds" value={String(availableBeds)} note="Current capacity remaining" icon={<BedDouble size={19} />} tone="coral" /></div>
    <div className="admin-dashboard-grid"><section className="panel admin-occupancy"><div className="panel-heading"><div><span className="eyebrow">CAPACITY SNAPSHOT</span><h2>Room occupancy</h2></div><Link to="/admin/rooms">Manage rooms <ArrowRight size={15} /></Link></div><div className="admin-occupancy-values"><div><strong>{occupiedBeds}</strong><span>Occupied</span></div><div><strong>{availableBeds}</strong><span>Available</span></div><div><strong>{totalCapacity}</strong><span>Capacity</span></div></div><div className="admin-occupancy-bar"><span style={{ width: totalCapacity ? `${Math.min(100, (occupiedBeds / totalCapacity) * 100)}%` : '0%' }} /></div></section><section className="panel admin-quick-links"><div className="panel-heading"><div><span className="eyebrow">QUICK NAVIGATION</span><h2>Manage SmartStay</h2></div></div><QuickLink href="/admin/students" title="Student Management" copy="View and manage student records" icon={<Users size={19} />} /><QuickLink href="/admin/rooms" title="Room Management" copy="Manage rooms and allocations" icon={<BedDouble size={19} />} /></section></div>
    <section className="panel admin-recent"><div className="panel-heading"><div><span className="eyebrow">RECENTLY LOADED</span><h2>Live records</h2></div></div><div className="admin-recent-grid"><div><h3>Students</h3>{data.students.slice(0, 5).map((student) => <div className="admin-record-row" key={student.student_id}><span>{student.full_name}</span><small>{student.student_id}</small></div>)}{data.students.length === 0 && <p className="admin-muted">No students found.</p>}</div><div><h3>Rooms</h3>{data.rooms.slice(0, 5).map((room) => <div className="admin-record-row" key={room.room_number}><span>{room.room_number}</span><small>{room.occupied_beds} / {room.capacity} beds</small></div>)}{data.rooms.length === 0 && <p className="admin-muted">No rooms found.</p>}</div></div></section>
  </>
}

function SummaryCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: string }) {
  return <div className={`admin-summary-card ${tone}`}><div className="admin-summary-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{note}</small></div>
}

function QuickLink({ href, title, copy, icon }: { href: string; title: string; copy: string; icon: React.ReactNode }) {
  return <Link className="admin-quick-link" to={href}><span>{icon}</span><span><strong>{title}</strong><small>{copy}</small></span><ArrowRight size={16} /></Link>
}

function DashboardState({ message }: { message: string }) {
  return <div className="admin-dashboard-state"><div className="admin-spinner" /><p>{message}</p></div>
}
