import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, BedDouble, Bell, Building2, CalendarDays, Check, ClipboardCheck, DoorOpen, FileText, Home, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Stethoscope, UserRound, Users, Utensils, WalletCards, X } from 'lucide-react'
import { announcements, leaveRequests, maintenance, menu, rooms, visitors, type Role } from './data'
import { attendanceService, complaintService, getCurrentUser, loginUser, logoutUser, messFeedbackService, roomService, studentDashboardService, studentService, type AttendanceRecord, type AttendanceSummary, type Complaint, type ComplaintCategory, type ComplaintPriority, type ComplaintStatus, type MessFeedback, type MessMeal, type Student, type Room } from './services'
import StudentManagement from './StudentManagement'
import RoomManagement from './RoomManagement'
import Signup from './Signup.tsx'
import './App.css'
import './auth.css'

type Page = { label: string; icon: typeof Home; path: string }
const studentPages: Page[] = [{ label: 'Dashboard', icon: LayoutDashboard, path: '/student' }, { label: 'My profile', icon: UserRound, path: '/student/profile' }, { label: 'My record', icon: FileText, path: '/student/record' }, { label: 'My room', icon: BedDouble, path: '/student/room' }, { label: 'Attendance', icon: ClipboardCheck, path: '/student/attendance' }, { label: 'Complaints', icon: MessageSquare, path: '/student/complaints' }, { label: 'Mess', icon: Utensils, path: '/student/mess' }, { label: 'Leave requests', icon: CalendarDays, path: '/student/leave' }, { label: 'Visitors', icon: Users, path: '/student/visitors' }, { label: 'Payments', icon: WalletCards, path: '/student/payments' }, { label: 'Notifications', icon: Bell, path: '/student/notifications' }]
const adminPages: Page[] = [{ label: 'Dashboard', icon: LayoutDashboard, path: '/admin' }, { label: 'Students', icon: Users, path: '/admin/students' }, { label: 'Rooms', icon: BedDouble, path: '/admin/rooms' }, { label: 'Allocations', icon: DoorOpen, path: '/admin/allocations' }, { label: 'Attendance', icon: ClipboardCheck, path: '/admin/attendance' }, { label: 'Complaints', icon: MessageSquare, path: '/admin/complaints' }, { label: 'Maintenance', icon: Stethoscope, path: '/admin/maintenance' }, { label: 'Mess', icon: Utensils, path: '/admin/mess' }, { label: 'Leave requests', icon: CalendarDays, path: '/admin/leave' }, { label: 'Visitors', icon: Users, path: '/admin/visitors' }, { label: 'Payments', icon: WalletCards, path: '/admin/payments' }, { label: 'Announcements', icon: Bell, path: '/admin/announcements' }, { label: 'Analytics', icon: Activity, path: '/admin/analytics' }, { label: 'Notifications', icon: Bell, path: '/admin/notifications' }]
const Badge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) => <span className={`badge ${tone}`}>{children}</span>
const Button = ({ children, variant = 'primary', onClick }: { children: React.ReactNode; variant?: string; onClick?: () => void }) => <button onClick={onClick} className={`button ${variant}`}>{children}</button>
const SearchInput = ({ placeholder = 'Search anything...' }: { placeholder?: string }) => <div className="search-input"><Search size={17} /><input placeholder={placeholder} /></div>

function App() { return <BrowserRouter><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<LoginRoute />} /><Route path="/student-login" element={<LoginRoute expectedRole="STUDENT" />} /><Route path="/admin-login" element={<LoginRoute expectedRole="ADMIN" />} /><Route path="/signup" element={<Signup />} /><Route path="/student/*" element={<Dashboard role="student" />} /><Route path="/admin/*" element={<AdminGate />} /></Routes></BrowserRouter> }

function AdminGate() { const navigate = useNavigate(); const [checking, setChecking] = useState(true); useEffect(() => { let cancelled = false; void getCurrentUser().then((user) => { if (!cancelled && user.role !== 'ADMIN') navigate('/student', { replace: true }) }).catch(() => { if (!cancelled) { logoutUser(); navigate('/admin-login', { replace: true }) } }).finally(() => { if (!cancelled) setChecking(false) }); return () => { cancelled = true } }, [navigate]); return checking ? <div className="admin-dashboard-state"><div className="admin-spinner" /><p>Verifying administrator access...</p></div> : <Dashboard role="admin" /> }

function Landing() {
  const navigate = useNavigate()
  return <div className="landing landing-photo-hero">
    <nav className="landing-nav landing-photo-nav">
      <Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link>
      <div className="landing-links"><a href="#features">Platform</a><a href="#flow">How it works</a><a href="#benefits">Benefits</a></div>
      <div className="nav-actions"><Link className="text-button" to="/admin-login">Admin</Link><Link className="text-button" to="/login">Sign in</Link><Button onClick={() => navigate('/login')}>Get started <ArrowRight size={16} /></Button></div>
    </nav>

    <main>
      <section className="photo-hero">
        <img className="photo-hero-image" src="/smartstay-hero.png" alt="Students relaxing and studying in a modern hostel common room" />
        <div className="photo-hero-overlay" />
        <div className="photo-hero-content">
          <span className="photo-hero-kicker"><i /> AI-POWERED HOSTEL MANAGEMENT</span>
          <h1>Smarter hostel management.<br /><em>Better everyday living.</em></h1>
          <p>One connected workspace for rooms, attendance, complaints, leave, visitors and payments — built for students and hostel teams.</p>
          <div className="photo-hero-actions"><Button onClick={() => navigate('/login')}>Explore SmartStay <ArrowRight size={16} /></Button><Link to="/signup">Create student account</Link></div>
          <div className="photo-hero-trust"><span><Check size={14} /> Centralized records</span><span><Check size={14} /> Faster requests</span><span><Check size={14} /> AI-ready foundation</span></div>
        </div>
      </section>

      <section id="features" className="section landing-section-v5">
        <div className="section-heading-v5"><span>SMARTSTAY PLATFORM</span><h2>Everything important,<br /><em>in one connected workflow.</em></h2><p>Simple tools for the routines that matter most to students and hostel teams.</p></div>
        <div className="feature-grid feature-grid-v5">
          {[[Building2,'Rooms & allocations','Capacity, occupancy and student allocation.'],[ClipboardCheck,'Attendance','Clear daily records and history.'],[MessageSquare,'Complaints','Track issues through a visible status flow.'],[CalendarDays,'Leave & visitors','Requests, approvals and visits.'],[WalletCards,'Payments','Fees, dues and transaction history.'],[Sparkles,'Analytics & AI','A foundation for intelligent hostel decisions.']].map(([Icon,title,copy],i)=>{const FeatureIcon=Icon as typeof Activity;return <div className="feature feature-v5" key={String(title)}><div className="feature-v5-top"><span>0{i+1}</span><b><FeatureIcon size={17}/></b></div><h3>{String(title)}</h3><p>{String(copy)}</p><ArrowRight size={15}/></div>})}
        </div>
      </section>

      <section id="flow" className="flow-band flow-band-v5">
        <div className="section-heading-v5"><span>HOW IT WORKS</span><h2>Simple workflows.<br /><em>Clearer hostel days.</em></h2></div>
        <div className="flow flow-v5">{[['01','Record','Keep student, room and attendance information organized.'],['02','Request','Let students raise complaints, leave and visitor requests.'],['03','Resolve','Give wardens one place to review and act.'],['04','Improve','Use analytics and AI to spot useful patterns.']].map(([n,t,d])=><div key={n}><strong>{n}</strong><b>{t}</b><small>{d}</small></div>)}</div>
      </section>

      <section id="benefits" className="benefits section benefits-v5">
        <div><span className="section-kicker">BUILT FOR CAMPUS LIFE</span><h2>Less manual work.<br /><em>More time for people.</em></h2><p>SmartStay gives students clarity and hostel teams a dependable operational view.</p><Button onClick={() => navigate('/login')}>Enter SmartStay <ArrowRight size={16} /></Button></div>
        <div className="benefit-list">{['One source of truth','Faster complaint handling','Clear room & attendance visibility','Better communication','AI-ready data'].map((item,i)=><div key={item}><span>0{i+1}</span><strong>{item}</strong><Check size={16}/></div>)}</div>
      </section>
    </main>

    <footer className="landing-footer-v5"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><span>Smart hostel management, made simple.</span><span>© 2026 SmartStay</span></footer>
  </div>
}

function LoginRoute({ expectedRole }: { expectedRole?: 'STUDENT' | 'ADMIN' }) { const location = useLocation(); const message = (location.state as { message?: string } | null)?.message; return <div className="login-route"><Login expectedRole={expectedRole} />{message && <div className="auth-success" role="status">{message}</div>}<div className="login-route-links"><Link className="auth-switch" to="/student-login">Student Login</Link><Link className="auth-switch" to="/admin-login">Admin Login</Link><Link className="auth-switch" to="/signup">Create an account</Link></div></div> }

function Login({ expectedRole }: { expectedRole?: 'STUDENT' | 'ADMIN' }) { const navigate = useNavigate(); const location = useLocation(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const role = expectedRole ?? (location.pathname === '/admin-login' ? 'ADMIN' : 'STUDENT'); const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const normalizedEmail = email.trim(); if (!normalizedEmail || !password) { setError('Enter your email and password to continue.'); return } setError(''); setLoading(true); try { const user = await loginUser(normalizedEmail, password); if (user.role !== role) { logoutUser(); setError(role === 'ADMIN' ? 'This account is for student access. Please use Student Login.' : 'This account is for administrator access. Please use Admin Login.'); return } navigate(role === 'ADMIN' ? '/admin' : '/student', { replace: true }) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to sign in right now. Please try again.') } finally { setLoading(false) } }; return <div className="login-page"><div className="login-art"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><div><Badge tone="dark">WELCOME TO A BETTER HOSTEL DAY</Badge><h1>Good systems make<br /><em>room for people.</em></h1><p>{role === 'ADMIN' ? 'Sign in to manage your SmartStay hostel workspace.' : 'Sign in to your SmartStay student workspace.'}</p></div><span className="login-art-foot">SmartStay / Campus operations, made clear.</span></div><div className="login-form"><span className="eyebrow">SECURE SIGN IN</span><h2>{role === 'ADMIN' ? 'Admin Login' : 'Student Login'}</h2><p className="muted">{role === 'ADMIN' ? 'Use your administrator account to continue.' : 'Use your student account to continue.'}</p><form className="auth-form" onSubmit={handleSubmit} noValidate><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" disabled={loading} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" disabled={loading} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : <>Sign in <ArrowRight size={16} /></>}</button></form><div className="login-note"><ShieldCheck size={17} /><span><strong>{role === 'ADMIN' ? 'Administrator access' : 'Student access'}</strong><br />Your role is verified by the SmartStay backend.</span></div></div></div> }

function Dashboard({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null)
  const pages = role === 'student' ? studentPages : adminPages
  const location = useLocation()
  const current = pages.find((page) => location.pathname === page.path) ?? pages[0]
  const initials = currentUser?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || (role === 'student' ? 'ST' : 'AD')
  useEffect(() => { let cancelled = false; getCurrentUser().then((user) => { if (!cancelled) setCurrentUser({ name: user.name, email: user.email }) }).catch(() => {}); return () => { cancelled = true } }, [])
  const groups = role === 'student'
    ? [{ label: 'Overview', items: pages.slice(0, 1) }, { label: 'My stay', items: pages.slice(1, 5) }, { label: 'Services', items: pages.slice(5, 9) }, { label: 'Finance & updates', items: pages.slice(9) }]
    : [{ label: 'Overview', items: pages.slice(0, 1) }, { label: 'People & spaces', items: pages.slice(1, 4) }, { label: 'Operations', items: pages.slice(4, 10) }, { label: 'Finance & communication', items: pages.slice(10, 12) }, { label: 'Insights', items: pages.slice(12) }]
  return <div className="app-shell dashboard-v5-shell"><div className={open ? 'mobile-scrim show' : 'mobile-scrim'} onClick={() => setOpen(false)} /><aside className={open ? 'sidebar open dashboard-v5-sidebar' : 'sidebar dashboard-v5-sidebar'}>
    <div className="side-brand"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
    <div className="workspace-switcher"><span className="workspace-icon">{role === 'student' ? <UserRound size={15}/> : <ShieldCheck size={15}/>}</span><span><small>{role === 'student' ? 'PERSONAL SPACE' : 'OPERATIONS SPACE'}</small><strong>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</strong></span><MoreHorizontal size={14}/></div>
    <nav className="side-nav side-nav-grouped">{groups.map(group => <div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.items.map(({label,icon:Icon,path})=><NavLink key={path} to={path} end={path === '/student' || path === '/admin'} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'active':''}><span className="nav-icon"><Icon size={16}/></span><span>{label}</span>{label === 'Notifications' && <span className="nav-count">3</span>}</NavLink>)}</div>)}</nav>
    <div className="side-bottom"><div className="help-card dashboard-v5-help"><span className="help-icon"><Sparkles size={15}/></span><div><strong>Smart AI</strong><small>Future intelligence for your hostel.</small></div></div><div className="profile-mini"><span className="avatar">{initials}</span><span className="profile-mini-copy"><strong>{currentUser?.name ?? (role === 'student' ? 'Student' : 'Administrator')}</strong><small>{currentUser?.email ?? ''}</small></span></div></div>
  </aside>
  <div className="main-shell"><header className="app-header dashboard-v5-header"><div className="header-left"><button className="menu-button" onClick={()=>setOpen(true)}><Menu/></button><div className="breadcrumb"><span>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</span><ArrowRight size={12}/><strong>{current.label}</strong></div></div><div className="header-actions"><SearchInput placeholder="Search SmartStay..."/><button className="icon-button header-notification" onClick={()=>location.pathname.startsWith('/student')?window.location.assign('/student/notifications'):window.location.assign('/admin/notifications')}><Bell size={18}/><i/></button><div className="header-avatar">{initials}</div></div></header><main className="dashboard-main dashboard-v5-main"><Routes><Route index element={role === 'student' ? <StudentHome/> : <AdminHome/>}/><Route path="*" element={role === 'student' ? <StudentPage path={location.pathname}/> : <AdminPage path={location.pathname}/>}/></Routes></main></div>
  </div>
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div> }
function StatCard({ label, value, note, tone, icon: Icon }: { label: string; value: string; note: string; tone: string; icon?: typeof Activity }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span>{Icon && <Icon size={18} />}</div><strong>{value}</strong><small>{note}</small></div> }
function StudentHome() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [error, setError] = useState('')
  useEffect(()=>{let cancelled=false;Promise.all([studentDashboardService.getProfile(),attendanceService.getOverview()]).then(([studentProfile,attendanceSummary])=>{if(!cancelled){setProfile(studentProfile);setAttendance(attendanceSummary)}}).catch(requestError=>{if(!cancelled)setError(requestError instanceof Error?requestError.message:'Unable to load your dashboard.')});return()=>{cancelled=true}},[])
  const displayName=profile?.full_name ?? 'Student'
  const firstName=displayName.split(' ')[0]
  const roomLabel=profile?.room_number ?? 'Not allocated'
  const attendanceValue=attendance ? String(attendance.attendance_percentage)+'%' : '—'
  const present=attendance?.present_days ?? 0
  const absent=attendance?.absent_days ?? 0
  const total=attendance?.total_days ?? 0
  return <>
    <div className="dash-welcome-v5"><div><span className="eyebrow">STUDENT OVERVIEW</span><h1>Good morning, {firstName} <span>👋</span></h1><p>Your hostel essentials, requests and updates in one clear view.</p></div><div className="dash-actions-v5"><button className="dash-btn-secondary" onClick={()=>navigate('/student/attendance')}><ClipboardCheck size={15}/> Attendance</button><button className="dash-btn-primary" onClick={()=>navigate('/student/complaints')}><Plus size={15}/> New request</button></div></div>
    {error && <div className="dashboard-alert"><AlertCircle size={16}/><span>{error}</span></div>}
    <div className="dash-kpi-grid-v5">
      <div className="dash-kpi-v5"><span>ATTENDANCE</span><strong>{attendanceValue}</strong><small>{present} present of {total} recorded</small><i><b style={{width:String(attendance?.attendance_percentage ?? 0)+'%'}}/></i></div>
      <div className="dash-kpi-v5"><span>MY ROOM</span><strong>{roomLabel}</strong><small>{profile?.room_number ? 'Active allocation' : 'Awaiting allocation'}</small></div>
      <div className="dash-kpi-v5"><span>HOSTEL STATUS</span><strong>{profile?.status?.replace('_',' ') ?? 'Loading'}</strong><small>{profile?.year ?? 'Student account'}</small></div>
      <div className="dash-kpi-v5"><span>NOTIFICATIONS</span><strong>3</strong><small>Unread SmartStay updates</small></div>
    </div>
    <div className="dash-grid-v5 top-v5">
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>ATTENDANCE</span><h2>Attendance overview</h2></div><Link to="/student/attendance">View records <ArrowRight size={13}/></Link></div><div className="attendance-body-v5"><div className="attendance-ring-v5" style={{'--value':String(attendance?.attendance_percentage ?? 0)+'%'} as React.CSSProperties}><strong>{attendanceValue}</strong><small>overall</small></div><div className="attendance-details-v5"><div><span>Present days</span><strong>{present}</strong></div><div><span>Absent days</span><strong>{absent}</strong></div><div><i><b style={{width:String(total ? (present/total)*100 : 0)+'%'}}/></i><small>Attendance progress</small></div></div></div></section>
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>MY ROOM</span><h2>{roomLabel}</h2></div><span className="room-icon-v5"><BedDouble size={20}/></span></div><div className="room-status-v5"><span>Allocation status</span><Badge tone={profile?.room_number?'mint':'amber'}>{profile?.room_number?'Active':'Pending'}</Badge></div><div className="room-facts-v5"><div><small>Student ID</small><strong>{profile?.student_id ?? '—'}</strong></div><div><small>Phone</small><strong>{profile?.phone ?? 'Not provided'}</strong></div></div><Link className="dash-link-v5" to="/student/room">View room details <ArrowRight size={13}/></Link></section>
    </div>
    <div className="dash-grid-v5 bottom-v5">
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>CAMPUS UPDATES</span><h2>Stay informed</h2></div><Link to="/student/notifications">View all <ArrowRight size={13}/></Link></div><div className="update-list-v5">{announcements.slice(0,4).map(item=><div className="update-item-v5" key={item.title}><span><Bell size={14}/></span><div><strong>{item.title}</strong><small>{item.body}</small><em>{item.date}</em></div></div>)}</div></section>
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>QUICK ACTIONS</span><h2>Get things done</h2></div><Sparkles size={15}/></div><div className="shortcut-list-v5">{[['Complaints',MessageSquare,'/student/complaints'],['Leave requests',CalendarDays,'/student/leave'],['Visitors',Users,'/student/visitors'],['Payments',WalletCards,'/student/payments']].map(([title,Icon,path])=>{const I=Icon as typeof Activity;return <button key={String(title)} onClick={()=>navigate(String(path))}><span><I size={15}/></span><strong>{String(title)}</strong><ArrowRight size={13}/></button>})}</div></section>
    </div>
  </>
}

function StudentPage({ path }: { path: string }) { const title = path.split('/').pop() ?? ''; if (title === 'profile') return <StudentProfilePage />; if (title === 'record') return <StudentManagement mode="student" />; if (title === 'room') return <RoomManagement mode="student" />; if (title === 'complaints') return <ComplaintPage mode="student" />; if (title === 'attendance') return <AttendancePage />; if (title === 'mess') return <MessPage />; if (title === 'leave') return <LeavePage />; if (title === 'visitors') return <VisitorsPage />; if (title === 'payments') return <PaymentsPage />; if (title === 'notifications') return <NotificationsPage />; return <GenericPage title={title} /> }


function StudentProfilePage() {
  const [profile, setProfile] = useState<Student | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [openEdit, setOpenEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', course: '', department: 'Computer Science & Engineering', year: '', gender: '', batch: '2024–2028' })

  const loadProfile = async () => {
    try {
      setError('')
      const student = await studentService.getProfile()
      setProfile(student)
      setForm({
        full_name: student.full_name,
        phone: student.phone,
        course: student.course,
        department: 'Computer Science & Engineering',
        year: student.year,
        gender: student.gender,
        batch: '2024–2028',
      })
      if (student.room_number) {
        try {
          setRoom(await roomService.get(student.room_number))
        } catch {
          setRoom(null)
        }
      } else {
        setRoom(null)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load your profile.')
    }
  }

  useEffect(() => { void loadProfile() }, [])

  const openEditor = () => {
    if (!profile) return
    setSaved(false)
    setForm({
      full_name: profile.full_name,
      phone: profile.phone,
      course: profile.course,
      department: 'Computer Science & Engineering',
      year: profile.year,
      gender: profile.gender,
      batch: '2024–2028',
    })
    setOpenEdit(true)
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await studentService.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        course: form.course,
        year: form.year,
        gender: form.gender,
      })
      setProfile(updated)
      setOpenEdit(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const roomLabel = room?.room_number ?? profile?.room_number ?? 'Not Allocated'

  return <>
    <PageHeader
      eyebrow="YOUR SMARTSTAY"
      title="My profile"
      copy="Manage your personal and academic information in one place."
      action={<Button onClick={openEditor}><Settings size={16} /> Edit Profile</Button>}
    />

    {error && <div className="student-profile-alert" role="alert"><AlertCircle size={16} /> <span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
    {saved && <div className="student-profile-success" role="status"><Check size={16} /> Profile updated successfully.</div>}

    {!profile ? (
      <section className="panel empty-state">
        <span className="spark"><UserRound size={20} /></span>
        <h2>Loading your profile...</h2>
        <p>We’re securely loading your student record.</p>
      </section>
    ) : <>
      <section className="student-profile-hero">
        <div className="student-profile-avatar">{profile.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div className="student-profile-identity">
          <span className="eyebrow">STUDENT PROFILE</span>
          <h2>{profile.full_name}</h2>
          <div className="student-profile-meta"><span>Student</span><Badge tone="mint">{profile.status.replace('_', ' ')}</Badge></div>
        </div>
        <div className="student-profile-id"><small>STUDENT ID</small><strong>{profile.student_id}</strong></div>
      </section>

      <div className="student-profile-grid">
        <section className="panel student-profile-card">
          <div className="panel-heading"><div><span className="eyebrow">PERSONAL INFORMATION</span><h2>Personal details</h2></div><UserRound size={19} /></div>
          <div className="student-profile-fields">
            <div><small>Full Name</small><strong>{profile.full_name}</strong></div>
            <div><small>Email</small><strong>{profile.email}</strong></div>
            <div><small>Phone Number</small><strong>{profile.phone || 'Not Provided'}</strong></div>
            <div><small>Gender</small><strong>{profile.gender || 'Not Provided'}</strong></div>
          </div>
        </section>

        <section className="panel student-profile-card">
          <div className="panel-heading"><div><span className="eyebrow">ACADEMIC INFORMATION</span><h2>Academic details</h2></div><FileText size={19} /></div>
          <div className="student-profile-fields">
            <div><small>Student ID</small><strong>{profile.student_id}</strong></div>
            <div><small>Course</small><strong>{profile.course || 'Not Provided'}</strong></div>
            <div><small>Department</small><strong>{form.department}</strong></div>
            <div><small>Year</small><strong>{profile.year || 'Not Provided'}</strong></div>
            <div><small>Batch</small><strong>{form.batch}</strong></div>
          </div>
        </section>

        <section className="panel student-profile-card student-profile-hostel">
          <div className="panel-heading"><div><span className="eyebrow">HOSTEL INFORMATION</span><h2>Room allocation</h2></div><BedDouble size={19} /></div>
          <div className="student-profile-room-status">
            <span>Allocation status</span>
            <Badge tone={profile.room_number ? 'mint' : 'amber'}>{profile.room_number ? 'Allocated' : 'Pending Allocation'}</Badge>
          </div>
          <div className="student-profile-fields student-profile-room-fields">
            <div><small>Room Number</small><strong>{roomLabel}</strong></div>
            <div><small>Block</small><strong>{room?.block ?? 'Not Allocated'}</strong></div>
            <div><small>Room Type</small><strong>{room?.room_type ?? 'Not Allocated'}</strong></div>
            <div><small>Floor</small><strong>{room ? String(room.floor) : 'Not Allocated'}</strong></div>
            <div><small>Occupancy</small><strong>{room ? `${room.occupied_beds} / ${room.capacity} beds` : 'Not Allocated'}</strong></div>
          </div>
          <p className="student-profile-note">Hostel and room allocation details are managed by the warden.</p>
        </section>
      </div>
    </>}

    {openEdit && profile && <Modal title="Edit Profile" close={() => !saving && setOpenEdit(false)}>
      <form className="student-profile-form" onSubmit={handleSave}>
        <div className="student-profile-form-grid">
          <label>Full Name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
          <label>Phone Number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <label>Course<input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required /></label>
          <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label>Year<select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}><option value="">Select year</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></label>
          <label>Gender<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></label>
          <label>Batch<input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></label>
        </div>
        <div className="student-profile-readonly">
          <span><small>Email</small><strong>{profile.email}</strong></span>
          <span><small>Student ID</small><strong>{profile.student_id}</strong></span>
        </div>
        <p className="student-profile-edit-note">Email, Student ID, account status and room allocation cannot be changed from the student profile.</p>
        <div className="student-profile-form-actions"><Button variant="secondary" onClick={() => setOpenEdit(false)}>Cancel</Button><Button>{saving ? 'Saving...' : 'Save Changes'}</Button></div>
      </form>
    </Modal>}
  </>
}


function ComplaintPage({ mode = 'student' }: { mode?: 'student' | 'admin' }) {
  const [items, setItems] = useState<Complaint[]>([])
  const [filter, setFilter] = useState<'All' | ComplaintStatus>('All')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'MAINTENANCE' as ComplaintCategory,
    priority: 'MEDIUM' as ComplaintPriority,
  })

  const loadComplaints = () => {
    setLoading(true)
    const request = mode === 'admin'
      ? complaintService.getAll(filter === 'All' ? undefined : filter)
      : complaintService.getMy(filter === 'All' ? undefined : filter)
    request.then(setItems)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load complaints.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadComplaints() }, [mode, filter])

  const submitComplaint = async () => {
    if (!form.title.trim() || form.description.trim().length < 5) {
      setError('Enter a title and a useful description before submitting.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await complaintService.create(form)
      setForm({ title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM' })
      setOpen(false)
      loadComplaints()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit complaint.')
    } finally {
      setSaving(false)
    }
  }

  const updateComplaint = async (item: Complaint, statusValue: ComplaintStatus, priorityValue: ComplaintPriority) => {
    setSaving(true)
    setError('')
    try {
      const updated = await complaintService.update(item.id, { status: statusValue, priority: priorityValue })
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update complaint.')
    } finally {
      setSaving(false)
    }
  }

  const statusTone = (statusValue: ComplaintStatus) => statusValue === 'RESOLVED' || statusValue === 'CLOSED' ? 'mint' : statusValue === 'IN_PROGRESS' ? 'blue' : 'amber'
  const priorityTone = (priorityValue: ComplaintPriority) => priorityValue === 'URGENT' ? 'coral' : priorityValue === 'HIGH' ? 'coral' : priorityValue === 'MEDIUM' ? 'amber' : 'mint'

  return <><PageHeader eyebrow={mode === 'admin' ? 'WARDEN SUPPORT DESK' : 'SUPPORT DESK'} title="Complaints" copy={mode === 'admin' ? 'Review, prioritize and resolve student complaints.' : 'Raise an issue and keep track of what happens next.'} action={mode === 'student' ? <Button onClick={() => setOpen(true)}><Plus size={17} /> New complaint</Button> : undefined} />
    {error && <div className="room-error"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
    <section className="panel"><div className="toolbar"><div className="tabs">{[['All','All'],['Open','OPEN'],['In Progress','IN_PROGRESS'],['Resolved','RESOLVED'],['Closed','CLOSED']].map(([label,value]) => <button className={filter === value ? 'selected' : ''} onClick={() => setFilter(value as 'All' | ComplaintStatus)} key={value}>{label}</button>)}</div><Badge tone="soft">{loading ? 'Loading...' : `${items.length} complaint${items.length === 1 ? '' : 's'}`}</Badge></div>
      {items.length === 0 && !loading ? <div className="empty-state"><span className="spark"><MessageSquare size={20} /></span><h2>No complaints found.</h2><p>{mode === 'student' ? 'Your submitted complaints will appear here.' : 'There are no complaints matching this filter.'}</p></div> :
      <div className="table-wrap"><table><thead><tr><th>Complaint</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th>{mode === 'admin' && <th>Actions</th>}</tr></thead><tbody>{items.map((item) => <tr key={item.id}>
        <td><strong>{item.complaint_number}</strong><small>{item.title}{item.room_number ? ` · Room ${item.room_number}` : ''}</small></td>
        <td>{item.category}</td>
        <td><Badge tone={priorityTone(item.priority)}>{item.priority}</Badge></td>
        <td><Badge tone={statusTone(item.status)}>{item.status.replace('_', ' ')}</Badge></td>
        <td>{new Date(item.created_at).toLocaleDateString()}</td>
        {mode === 'admin' && <td><select className="compact-select" disabled={saving} value={item.status} onChange={(event) => updateComplaint(item, event.target.value as ComplaintStatus, item.priority)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><select className="compact-select" disabled={saving} value={item.priority} onChange={(event) => updateComplaint(item, item.status, event.target.value as ComplaintPriority)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></td>}
      </tr>)}</tbody></table></div>}
    </section>
    {mode === 'student' && <section className="smart-classification"><div><span className="spark"><Sparkles size={17} /></span><div><Badge tone="dark">SMART CLASSIFICATION · NEXT</Badge><h2>AI-assisted complaint routing</h2><p>Your complaint system is now real; AI category/priority suggestions can be connected next.</p></div></div><small><Sparkles size={13} /> Planned AI layer.</small></section>}
    {open && <Modal title="Create a complaint" close={() => setOpen(false)}>
      <label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ComplaintCategory }))}><option value="MAINTENANCE">Maintenance</option><option value="MESS">Mess</option><option value="ROOM">Room</option><option value="INTERNET">Internet</option><option value="SECURITY">Security</option><option value="HOSTEL">Hostel</option><option value="OTHER">Other</option></select></label>
      <label>Subject<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs attention?" /></label>
      <label>Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add helpful details..." /></label>
      <label>Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as ComplaintPriority }))}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
      <Button onClick={submitComplaint}>{saving ? 'Submitting...' : 'Submit complaint'} <ArrowRight size={15} /></Button>
    </Modal>}
  </>
}

function AttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([attendanceService.getOverview(), attendanceService.getRecords()])
      .then(([attendanceSummary, attendanceRecords]) => { if (!cancelled) { setSummary(attendanceSummary); setRecords(attendanceRecords) } })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load attendance.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  return <><PageHeader eyebrow="YOUR PRESENCE" title="Attendance" copy="Your attendance records from the SmartStay database." />
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="stats-grid">
      <StatCard label="Overall attendance" value={summary ? `${summary.attendance_percentage}%` : '—'} note={summary ? `${summary.present_days} present of ${summary.total_days} recorded days` : 'Loading'} tone="mint" icon={ClipboardCheck} />
      <StatCard label="Present days" value={summary ? String(summary.present_days) : '—'} note="Recorded as present" tone="blue" icon={Check} />
      <StatCard label="Absent days" value={summary ? String(summary.absent_days) : '—'} note="Recorded as absent" tone="coral" icon={Activity} />
      <StatCard label="Total recorded" value={summary ? String(summary.total_days) : '—'} note="Attendance entries" tone="amber" icon={CalendarDays} />
    </div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">DAILY RECORDS</span><h2>Attendance history</h2></div>{loading && <Badge tone="soft">Loading...</Badge>}</div>
      {records.length === 0 && !loading ? <div className="empty-state"><span className="spark"><ClipboardCheck size={20} /></span><h2>No attendance records yet.</h2><p>Your attendance will appear here after the warden records it.</p></div> :
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{new Date(record.attendance_date).toLocaleDateString()}</strong></td><td><Badge tone={record.status === 'PRESENT' ? 'mint' : 'coral'}>{record.status}</Badge></td></tr>)}</tbody></table></div>}
    </section>
  </>
}

function MessPage() {
  const [items, setItems] = useState<MessFeedback[]>([])
  const [open, setOpen] = useState(false)
  const [meal, setMeal] = useState<MessMeal>('LUNCH')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadFeedback = () => {
    setLoading(true)
    messFeedbackService.getMy().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load feedback.')).finally(() => setLoading(false))
  }

  useEffect(() => { loadFeedback() }, [])

  const submitFeedback = async () => {
    setSaving(true)
    setError('')
    try {
      await messFeedbackService.create({ meal, rating, comment })
      setComment('')
      setRating(5)
      setOpen(false)
      loadFeedback()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit feedback.')
    } finally {
      setSaving(false)
    }
  }

  return <><PageHeader eyebrow="FUEL FOR YOUR DAY" title="Mess management" copy="See what’s cooking and let the team know how it felt." action={<Button onClick={() => setOpen(true)}><MessageSquare size={17} /> Give feedback</Button>} />
    <section className="menu-highlight"><div><span className="eyebrow">TODAY · WEDNESDAY</span><h2>Comfort food, with a little <em>crunch.</em></h2><p>Fresh, balanced meals planned by the campus mess team.</p></div><Utensils size={72} strokeWidth={1.2} /></section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">WEEKLY MENU</span><h2>What’s on the table</h2></div></div><div className="menu-table"><div className="menu-head"><span>Day</span><span>Breakfast</span><span>Lunch</span><span>Snacks</span><span>Dinner</span></div>{menu.map((day) => <div className="menu-row" key={day.day}><strong>{day.day}</strong>{day.meals.map((meal) => <span key={meal}>{meal}</span>)}</div>)}</div></section>
    {error && <div className="room-error"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR FEEDBACK</span><h2>Mess feedback history</h2></div><Badge tone="soft">{loading ? 'Loading...' : `${items.length} submitted`}</Badge></div>
      {items.length === 0 && !loading ? <div className="empty-state"><span className="spark"><MessageSquare size={20} /></span><h2>No feedback yet.</h2><p>Tell the mess team how today's meal was.</p></div> :
      <div className="feedback-list">{items.map((item) => <div className="feedback-row" key={item.id}><div><strong>{item.meal}</strong><small>{new Date(item.created_at).toLocaleDateString()}{item.comment ? ` · ${item.comment}` : ''}</small></div><span className="feedback-stars">{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</span><Badge tone={item.reviewed ? 'mint' : 'amber'}>{item.reviewed ? 'Reviewed' : 'Pending'}</Badge></div>)}</div>}
    </section>
    {open && <Modal title="Give mess feedback" close={() => setOpen(false)}>
      <label>Meal<select value={meal} onChange={(e) => setMeal(e.target.value as MessMeal)}><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="SNACKS">Snacks</option><option value="DINNER">Dinner</option></select></label>
      <label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label>
      <label>Comment<textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell the mess team what went well or what could improve..." /></label>
      <Button onClick={submitFeedback}>{saving ? 'Submitting...' : 'Submit feedback'} <ArrowRight size={15} /></Button>
    </Modal>}
  </>
}
function LeavePage() { const [open, setOpen] = useState(false); return <><PageHeader eyebrow="PLAN AHEAD" title="Leave requests" copy="Request time away and keep your plans in view." action={<Button onClick={() => setOpen(true)}><Plus size={17} /> Request leave</Button>} /><section className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR REQUESTS</span><h2>Leave history</h2></div><Badge tone="soft">1 pending</Badge></div><div className="request-list">{leaveRequests.map((request) => <div className="request-row" key={request.id}><span className="calendar-tile"><CalendarDays size={18} /></span><div><strong>{request.type}</strong><small>{request.from} - {request.to} · {request.reason}</small></div><Badge tone={request.status === 'Approved' ? 'mint' : request.status === 'Pending' ? 'amber' : 'coral'}>{request.status}</Badge><MoreHorizontal size={18} /></div>)}</div></section>{open && <Modal title="Request leave" close={() => setOpen(false)}><label>Leave type<select><option>Personal leave</option><option>Medical leave</option><option>Weekend leave</option></select></label><div className="form-grid"><label>From date<input type="date" /></label><label>To date<input type="date" /></label></div><label>Reason<textarea placeholder="Reason for your leave" /></label><Button onClick={() => setOpen(false)}>Send for review <ArrowRight size={15} /></Button></Modal>}</> }
function VisitorsPage() { const [open, setOpen] = useState(false); return <><PageHeader eyebrow="WELCOME VISITORS" title="Visitors" copy="Register guests before they arrive at the hostel." action={<Button onClick={() => setOpen(true)}><Plus size={17} /> Register visitor</Button>} /><section className="panel"><div className="toolbar"><div><span className="eyebrow">UPCOMING & RECENT</span><h2>Visitor log</h2></div><SearchInput placeholder="Search visitors" /></div><div className="visitor-grid">{visitors.map((v) => <div className="visitor-card" key={v.name}><span className="visitor-avatar">{v.name.split(' ').map((x) => x[0]).join('')}</span><div><strong>{v.name}</strong><small>{v.relation} · {v.date} at {v.time}</small></div><Badge tone={v.status === 'Expected' ? 'blue' : 'neutral'}>{v.status}</Badge></div>)}</div></section>{open && <Modal title="Register a visitor" close={() => setOpen(false)}><label>Visitor name<input placeholder="Full name" /></label><label>Relationship<input placeholder="e.g. Parent, friend" /></label><div className="form-grid"><label>Date<input type="date" /></label><label>Expected time<input type="time" /></label></div><Button onClick={() => setOpen(false)}>Register visitor <ArrowRight size={15} /></Button></Modal>}</> }
function PaymentsPage() { return <><PageHeader eyebrow="CLEAR & SIMPLE" title="Payments" copy="Your hostel fee summary and payment history." action={<Button variant="secondary"><FileText size={17} /> Download statement</Button>} /><div className="payment-summary"><div><span className="eyebrow">TOTAL HOSTEL FEE</span><strong>₹ 84,000</strong><small>Academic year 2026-27</small></div><div><span className="eyebrow">PAID</span><strong className="green-text">₹ 56,000</strong><small>2 installments completed</small></div><div><span className="eyebrow">PENDING</span><strong className="coral-text">₹ 28,000</strong><small>Next due Oct 15, 2026</small></div></div><section className="panel"><div className="panel-heading"><div><span className="eyebrow">TRANSACTION HISTORY</span><h2>Payment history</h2></div></div><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Date</th><th>Purpose</th><th>Amount</th><th>Status</th></tr></thead><tbody>{[['PAY-2081', 'Sep 02, 2026', 'Hostel fee · Installment 2', '₹ 28,000'], ['PAY-1942', 'Jun 04, 2026', 'Hostel fee · Installment 1', '₹ 28,000'], ['PAY-1720', 'May 30, 2026', 'Security deposit', '₹ 10,000']].map((x) => <tr key={x[0]}><td><strong>{x[0]}</strong></td><td>{x[1]}</td><td>{x[2]}</td><td><strong>{x[3]}</strong></td><td><Badge tone="mint">Paid</Badge></td></tr>)}</tbody></table></div></section></> }
function NotificationsPage() { return <><PageHeader eyebrow="STAY IN THE KNOW" title="Notifications" copy="The little updates that keep hostel life moving." action={<Button variant="secondary"><Check size={16} /> Mark all read</Button>} /><section className="panel notification-panel">{['Complaint status updated', 'New hostel announcement', 'Leave request received', 'Maintenance notice'].map((x, i) => <div className={i < 2 ? 'notification unread' : 'notification'} key={x}><span className={`notification-icon ${['mint', 'blue', 'amber', 'coral'][i]}`}><Bell size={17} /></span><div><strong>{x}</strong><p>{['Your AC repair request is now in progress.', 'Block B electrical inspection is scheduled for Saturday.', 'Your personal leave request is awaiting review.', 'Water supply will be paused in Block C from 11 AM.'][i]}</p><small>{i + 1} {i ? 'day' : 'hour'} ago</small></div><MoreHorizontal size={18} /></div>)}</section></> }
function GenericPage({ title }: { title: string }) { return <><PageHeader eyebrow="YOUR SMARTSTAY" title={title.charAt(0).toUpperCase() + title.slice(1)} copy="Your hostel information, organized in one thoughtful workspace." /><section className="room-detail-grid"><section className="panel room-detail-hero"><div className="room-number">B-204</div><Badge tone="mint">Occupied · Good standing</Badge><p>Block B · Twin sharing · Bed B-204-2</p><div className="room-detail-stats"><span><small>Roommate</small><strong>Ishaan Verma</strong></span><span><small>Occupancy</small><strong>2 of 2 beds</strong></span><span><small>Floor</small><strong>Second floor</strong></span></div></section><section className="panel"><div className="panel-heading"><h2>Facilities</h2><BedDouble size={19} /></div><div className="facilities">{['Study desk & chair', 'Attached washroom', 'Wi-Fi enabled', '24/7 security'].map((x) => <div key={x}><Check size={17} />{x}</div>)}</div></section></section></> }
function AdminPage({ path }: { path: string }) {
  const key = path.split('/').pop() ?? ''
  if (key === 'students') return <StudentManagement mode="admin" />
  if (key === 'rooms') return <RoomManagement mode="admin" />
  if (key === 'complaints') return <ComplaintPage mode="admin" />
  if (key === 'mess') return <AdminMessPage />
  return <><PageHeader eyebrow="WARDEN WORKSPACE" title={key.charAt(0).toUpperCase() + key.slice(1)} copy="A prepared operations view for your hostel team." action={<Button><Plus size={17} /> New action</Button>} /><section className="panel admin-table"><div className="toolbar"><SearchInput placeholder="Search this workspace" /><Badge tone="soft">Mock data</Badge></div>{key === 'allocations' ? <DataTable headers={['Room', 'Block', 'Type', 'Occupants', 'Status']} rows={rooms.map((x) => [x.room, x.block, x.type, x.occupants, x.status])} /> : key === 'maintenance' ? <DataTable headers={['Asset', 'Location', 'Last maintenance', 'Complaints', 'Status']} rows={maintenance.map((x) => [x.asset, x.location, x.last, String(x.complaints), x.status])} /> : <div className="empty-state"><span className="spark"><Settings size={20} /></span><h2>Clearer operations start here.</h2><p>This module is ready for local mock interactions and future FastAPI service integration.</p></div>}</section></>
}

function AdminMessPage() {
  const [items, setItems] = useState<MessFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFeedback = () => {
    setLoading(true)
    messFeedbackService.getAll().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load feedback.')).finally(() => setLoading(false))
  }

  useEffect(() => { loadFeedback() }, [])

  const toggleReviewed = async (item: MessFeedback) => {
    try {
      const updated = await messFeedbackService.update(item.id, !item.reviewed)
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update feedback.')
    }
  }

  const average = items.length ? (items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1) : '—'

  return <><PageHeader eyebrow="MESS OPERATIONS" title="Mess feedback" copy="Review student ratings and use their comments to improve meals." />
    {error && <div className="room-error"><span>{error}</span><button onClick={() => setError('')}><X size={15} /></button></div>}
    <div className="stats-grid"><StatCard label="Average rating" value={average === '—' ? average : `${average}/5`} note="Across submitted feedback" tone="mint" icon={Utensils} /><StatCard label="Responses" value={String(items.length)} note="Student submissions" tone="blue" icon={MessageSquare} /><StatCard label="Pending review" value={String(items.filter((item) => !item.reviewed).length)} note="Needs attention" tone="amber" icon={AlertCircle} /></div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">STUDENT FEEDBACK</span><h2>Recent responses</h2></div>{loading && <Badge tone="soft">Loading...</Badge>}</div>
      {items.length === 0 && !loading ? <div className="empty-state"><span className="spark"><MessageSquare size={20} /></span><h2>No feedback submitted.</h2><p>Student mess feedback will appear here.</p></div> :
      <div className="table-wrap"><table><thead><tr><th>Meal</th><th>Rating</th><th>Comment</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.meal}</strong></td><td><span className="feedback-stars">{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</span></td><td>{item.comment || '—'}</td><td>{new Date(item.created_at).toLocaleDateString()}</td><td><Badge tone={item.reviewed ? 'mint' : 'amber'}>{item.reviewed ? 'Reviewed' : 'Pending'}</Badge></td><td><Button variant="secondary" onClick={() => toggleReviewed(item)}>{item.reviewed ? 'Mark pending' : 'Mark reviewed'}</Button></td></tr>)}</tbody></table></div>}
    </section>
  </>
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={cell}>{j === 0 ? <strong>{cell}</strong> : j === row.length - 1 ? <Badge tone={cell === 'Active' || cell === 'Occupied' || cell === 'Resolved' || cell === 'Healthy' ? 'mint' : 'amber'}>{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div> }
function AdminHome() {
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [roomCount, setRoomCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([studentService.list(), roomService.list()])
      .then(([students, roomsList]) => {
        if (!cancelled) {
          setStudentCount(students.length)
          setRoomCount(roomsList.length)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return <>
    <div className="dash-welcome-v5"><div><span className="eyebrow">WARDEN OVERVIEW</span><h1>Good morning, Warden <span>👋</span></h1><p>A clear operational view of your students, rooms and daily hostel activity.</p></div><div className="dash-actions-v5"><button className="dash-btn-secondary" onClick={() => window.location.assign('/admin/rooms')}><BedDouble size={15}/> Rooms</button><button className="dash-btn-primary" onClick={() => window.location.assign('/admin/complaints')}><MessageSquare size={15}/> Complaints</button></div></div>
    <div className="dash-kpi-grid-v5">
      <div className="dash-kpi-v5"><span>STUDENTS</span><strong>{studentCount === null ? '—' : String(studentCount)}</strong><small>Student records</small></div>
      <div className="dash-kpi-v5"><span>ROOMS</span><strong>{roomCount === null ? '—' : String(roomCount)}</strong><small>Managed hostel rooms</small></div>
      <div className="dash-kpi-v5"><span>ATTENDANCE</span><strong>Live</strong><small>Open attendance workspace</small></div>
      <div className="dash-kpi-v5"><span>SMART AI</span><strong>Ready</strong><small>Intelligence layer foundation</small></div>
    </div>
    <div className="dash-grid-v5 top-v5">
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>ROOM OPERATIONS</span><h2>Hostel spaces</h2></div><Link to="/admin/rooms">Open rooms <ArrowRight size={13}/></Link></div><div className="admin-space-v5"><span><BedDouble size={23}/></span><div><strong>{roomCount === null ? 'Loading rooms…' : String(roomCount) + ' rooms managed'}</strong><small>Inspect capacity, occupancy and student allocations from the Rooms workspace.</small></div></div><Link className="dash-link-v5" to="/admin/rooms">Manage rooms <ArrowRight size={13}/></Link></section>
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>COMMON ACTIONS</span><h2>Operations hub</h2></div><Activity size={15}/></div><div className="shortcut-list-v5"><button onClick={() => window.location.assign('/admin/students')}><span><Users size={15}/></span><strong>Students</strong><ArrowRight size={13}/></button><button onClick={() => window.location.assign('/admin/attendance')}><span><ClipboardCheck size={15}/></span><strong>Attendance</strong><ArrowRight size={13}/></button><button onClick={() => window.location.assign('/admin/complaints')}><span><MessageSquare size={15}/></span><strong>Complaints</strong><ArrowRight size={13}/></button><button onClick={() => window.location.assign('/admin/leave')}><span><CalendarDays size={15}/></span><strong>Leave requests</strong><ArrowRight size={13}/></button></div></section>
    </div>
    <div className="dash-grid-v5 bottom-v5">
      <section className="dash-card-v5"><div className="dash-head-v5"><div><span>HOSTEL OPERATIONS</span><h2>Keep everything visible</h2></div><Sparkles size={15}/></div><div className="admin-tile-grid-v5"><div><span><Users size={15}/></span><strong>Students</strong><small>Profiles & records</small></div><div><span><BedDouble size={15}/></span><strong>Rooms</strong><small>Capacity & allocations</small></div><div><span><ClipboardCheck size={15}/></span><strong>Attendance</strong><small>Daily records</small></div><div><span><Bell size={15}/></span><strong>Announcements</strong><small>Campus updates</small></div></div></section>
      <section className="dash-card-v5 ai-card-v5"><div className="dash-head-v5"><div><span>SMART AI</span><h2>Built for smarter decisions</h2></div><Sparkles size={15}/></div><p>Complaint classification, predictive maintenance, attendance risk and occupancy forecasting can plug into this workspace as the AI layer is developed.</p><div className="ai-list-v5"><span><b>01</b> Complaint classification</span><span><b>02</b> Predictive maintenance</span><span><b>03</b> Occupancy forecasting</span></div></section>
    </div>
  </>
}


function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={close}><X size={18} /></button></div>{children}</div></div> }

export default App
