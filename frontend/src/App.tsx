import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, BedDouble, Bell, Building2, CalendarDays, Check, ClipboardCheck, DoorOpen, FileText, Home, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Stethoscope, UserRound, Users, Utensils, WalletCards, X } from 'lucide-react'
import { announcements, complaints, leaveRequests, maintenance, menu, rooms, stats, student, visitors, type Role } from './data'
import { attendanceService, complaintService, getCurrentUser, loginUser, logoutUser, studentDashboardService, type AttendanceRecord, type AttendanceSummary, type Complaint, type ComplaintCategory, type ComplaintPriority, type ComplaintStatus, type Student } from './services'
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

function App() { return <BrowserRouter><Routes><Route path="/" element={<LandingEntry />} /><Route path="/login" element={<LoginRoute />} /><Route path="/student-login" element={<LoginRoute expectedRole="STUDENT" />} /><Route path="/admin-login" element={<LoginRoute expectedRole="ADMIN" />} /><Route path="/signup" element={<Signup />} /><Route path="/student/*" element={<Dashboard role="student" />} /><Route path="/admin/*" element={<AdminGate />} /></Routes></BrowserRouter> }

function AdminGate() { const navigate = useNavigate(); const [checking, setChecking] = useState(true); useEffect(() => { let cancelled = false; void getCurrentUser().then((user) => { if (!cancelled && user.role !== 'ADMIN') navigate('/student', { replace: true }) }).catch(() => { if (!cancelled) { logoutUser(); navigate('/admin-login', { replace: true }) } }).finally(() => { if (!cancelled) setChecking(false) }); return () => { cancelled = true } }, [navigate]); return checking ? <div className="admin-dashboard-state"><div className="admin-spinner" /><p>Verifying administrator access...</p></div> : <Dashboard role="admin" /> }

function LandingEntry() { return <div className="landing-entry"><Landing /><div className="landing-auth-links"><Link to="/student-login">Student Login</Link><Link to="/admin-login">Admin Login</Link><Link to="/signup">Create Student Account</Link></div></div> }

function LoginRoute({ expectedRole }: { expectedRole?: 'STUDENT' | 'ADMIN' }) { const location = useLocation(); const message = (location.state as { message?: string } | null)?.message; return <div className="login-route"><Login expectedRole={expectedRole} />{message && <div className="auth-success" role="status">{message}</div>}<div className="login-route-links"><Link className="auth-switch" to="/student-login">Student Login</Link><Link className="auth-switch" to="/admin-login">Admin Login</Link><Link className="auth-switch" to="/signup">Create an account</Link></div></div> }

function Landing() { const navigate = useNavigate(); return <div className="landing"><nav className="landing-nav"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><div className="landing-links"><a href="#features">Features</a><a href="#flow">How it works</a><a href="#benefits">Benefits</a></div><div className="nav-actions"><Link className="text-button" to="/login">Log in</Link><Button onClick={() => navigate('/login')}>Get started <ArrowRight size={16} /></Button></div></nav><main><section className="hero"><div className="hero-copy"><Badge tone="soft"><Sparkles size={14} /> Built for campus living</Badge><h1>Hostel operations,<br /><em>made human.</em></h1><p>SmartStay brings rooms, people, requests and daily hostel operations into one calm, connected workspace.</p><div className="hero-actions"><Button onClick={() => navigate('/login')}>Explore the platform <ArrowRight size={16} /></Button><a href="#features" className="play-link"><span>▶</span> See what’s inside</a></div><div className="hero-proof"><div className="avatar-stack"><span>AM</span><span>NR</span><span>KS</span><span>+1k</span></div><p><strong>1,248 students</strong><br />already organized</p></div></div><div className="hero-art"><div className="art-grid" /><div className="hero-panel"><div className="mini-top"><span>Today at SmartStay</span><span className="live-dot" /> Live overview</div><div className="occupancy"><div><small>Room occupancy</small><strong>82.4%</strong><span className="up">↑ 4.8%</span></div><div className="ring"><span>82</span></div></div><div className="chart"><span style={{ height: '38%' }} /><span style={{ height: '58%' }} /><span style={{ height: '46%' }} /><span style={{ height: '72%' }} /><span style={{ height: '63%' }} /><span style={{ height: '88%' }} /><span style={{ height: '79%' }} /><span style={{ height: '94%' }} /></div><div className="art-list"><span><i className="dot mint" /> Complaints resolved <strong>24</strong></span><span><i className="dot coral" /> New leave requests <strong>08</strong></span></div></div><div className="floating-note"><Check size={15} /> Everything in one place</div></div></section><section id="features" className="section"><div className="section-heading"><Badge>CORE WORKSPACE</Badge><h2>Less chasing. More <em>belonging.</em></h2><p>Every routine task gets a clearer path, so students feel looked after and teams can focus on the work that matters.</p></div><div className="feature-grid">{[[Building2, 'Smart room management', 'Know every room, bed and allocation at a glance.'], [MessageSquare, 'Complaint management', 'Keep every request visible from first note to resolution.'], [ClipboardCheck, 'Attendance tracking', 'Simple records that make follow-up feel effortless.'], [Utensils, 'Mess management', 'Menus, feedback and meal moments in one place.'], [CalendarDays, 'Leave & visitor management', 'A smoother way to plan arrivals and departures.'], [Sparkles, 'Intelligent insights', 'A prepared foundation for future AI-assisted decisions.']].map(([Icon, title, copy]) => <div className="feature" key={String(title)}><span className="feature-icon">{<Icon size={20} />}</span><h3>{title as string}</h3><p>{copy as string}</p><ArrowRight size={17} /></div>)}</div></section><section id="flow" className="flow-band"><div className="section-heading"><Badge tone="dark">THE SMARTSTAY LOOP</Badge><h2>From a request to a <em>better day.</em></h2></div><div className="flow">{['Students & wardens', 'SmartStay platform', 'Hostel operations', 'Useful insights'].map((x, i) => <div key={x}><span>0{i + 1}</span>{[Users, ShieldCheck, Building2, Activity].map((Icon, j) => i === j && <Icon key={x} size={21} />)}<strong>{x}</strong><small>{['One shared starting point', 'Simple, visible workflows', 'Faster everyday decisions', 'Plan with more confidence'][i]}</small></div>)}</div></section><section id="benefits" className="benefits section"><div><Badge tone="soft">A QUIETER CAMPUS</Badge><h2>Make space for the <em>good stuff.</em></h2><p>SmartStay gives every role the context they need without making anyone learn a complicated system.</p><Button onClick={() => navigate('/login')}>Step inside SmartStay <ArrowRight size={16} /></Button></div><div className="benefit-list">{['Centralized records', 'Faster complaint handling', 'Better monitoring', 'Data-driven planning', 'Real-time updates'].map((item, i) => <div key={item}><span>0{i + 1}</span><strong>{item}</strong><Check size={17} /></div>)}</div></section></main><footer><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><span>Thoughtful infrastructure for campus life.</span><span>© 2026 SmartStay</span></footer></div> }

function Login({ expectedRole }: { expectedRole?: 'STUDENT' | 'ADMIN' }) { const navigate = useNavigate(); const location = useLocation(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const role = expectedRole ?? (location.pathname === '/admin-login' ? 'ADMIN' : 'STUDENT'); const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const normalizedEmail = email.trim(); if (!normalizedEmail || !password) { setError('Enter your email and password to continue.'); return } setError(''); setLoading(true); try { const user = await loginUser(normalizedEmail, password); if (user.role !== role) { logoutUser(); setError(role === 'ADMIN' ? 'This account is for student access. Please use Student Login.' : 'This account is for administrator access. Please use Admin Login.'); return } navigate(role === 'ADMIN' ? '/admin' : '/student', { replace: true }) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to sign in right now. Please try again.') } finally { setLoading(false) } }; return <div className="login-page"><div className="login-art"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><div><Badge tone="dark">WELCOME TO A BETTER HOSTEL DAY</Badge><h1>Good systems make<br /><em>room for people.</em></h1><p>{role === 'ADMIN' ? 'Sign in to manage your SmartStay hostel workspace.' : 'Sign in to your SmartStay student workspace.'}</p></div><span className="login-art-foot">SmartStay / Campus operations, made clear.</span></div><div className="login-form"><span className="eyebrow">SECURE SIGN IN</span><h2>{role === 'ADMIN' ? 'Admin Login' : 'Student Login'}</h2><p className="muted">{role === 'ADMIN' ? 'Use your administrator account to continue.' : 'Use your student account to continue.'}</p><form className="auth-form" onSubmit={handleSubmit} noValidate><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" disabled={loading} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" disabled={loading} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : <>Sign in <ArrowRight size={16} /></>}</button></form><div className="login-note"><ShieldCheck size={17} /><span><strong>{role === 'ADMIN' ? 'Administrator access' : 'Student access'}</strong><br />Your role is verified by the SmartStay backend.</span></div></div></div> }

function Dashboard({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null)
  const pages = role === 'student' ? studentPages : adminPages
  const location = useLocation()
  const current = pages.find((page) => location.pathname === page.path) ?? pages[0]
  const initials = currentUser?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || (role === 'student' ? 'ST' : 'AD')

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((user) => {
      if (!cancelled) setCurrentUser({ name: user.name, email: user.email })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const groupedPages = role === 'student'
    ? [
        { label: 'Overview', items: pages.slice(0, 1) },
        { label: 'My stay', items: pages.slice(1, 5) },
        { label: 'Requests & services', items: pages.slice(5, 9) },
        { label: 'Finance & updates', items: pages.slice(9) },
      ]
    : [
        { label: 'Overview', items: pages.slice(0, 1) },
        { label: 'People & spaces', items: pages.slice(1, 4) },
        { label: 'Operations', items: pages.slice(4, 10) },
        { label: 'Insights & system', items: pages.slice(10) },
      ]

  return <div className="app-shell">
    <div className={open ? 'mobile-scrim show' : 'mobile-scrim'} onClick={() => setOpen(false)} />
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="side-brand">
        <Link className="brand" to="/">
          <span className="brand-mark"><Building2 size={17} /></span>
          smart<span>stay</span>
        </Link>
        <button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>
      </div>

      <div className="workspace-switcher">
        <span className="workspace-icon">{role === 'student' ? <UserRound size={15} /> : <ShieldCheck size={15} />}</span>
        <span><small>{role === 'student' ? 'Personal space' : 'Operations space'}</small><strong>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</strong></span>
        <MoreHorizontal size={15} />
      </div>

      <nav className="side-nav side-nav-grouped">
        {groupedPages.map((group) => <div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.items.map(({ label, icon: Icon, path }) =>
            <NavLink
              onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? 'active' : ''}
              to={path}
              key={path}
              end={path === '/student' || path === '/admin'}
            >
              <span className="nav-icon"><Icon size={17} /></span>
              <span>{label}</span>
              {label === 'Notifications' && <span className="nav-count">3</span>}
            </NavLink>
          )}
        </div>)}
      </nav>

      <div className="side-bottom">
        <div className="help-card premium-help">
          <span className="help-icon"><Sparkles size={16} /></span>
          <div><strong>SmartStay assistant</strong><small>AI insights are coming to your workspace.</small></div>
        </div>
        <div className="profile-mini">
          <span className="avatar">{initials}</span>
          <span className="profile-mini-copy">
            <strong>{currentUser?.name ?? (role === 'student' ? 'Student' : 'Administrator')}</strong>
            <small>{currentUser?.email ?? (role === 'student' ? 'Student account' : 'Administrator account')}</small>
          </span>
          <button className="profile-menu" aria-label="Account options"><MoreHorizontal size={17} /></button>
        </div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="app-header">
        <div className="header-left">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="breadcrumb">
            <span>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</span>
            <ArrowRight size={13} />
            <strong>{current.label}</strong>
          </div>
        </div>
        <div className="header-actions">
          <SearchInput placeholder="Search SmartStay..." />
          <button className="icon-button header-notification" aria-label="Notifications" onClick={() => location.pathname.startsWith('/student') ? window.location.assign('/student/notifications') : window.location.assign('/admin/notifications')}>
            <Bell size={18} /><i />
          </button>
          <div className="header-avatar" title={currentUser?.name ?? ''}>{initials}</div>
        </div>
      </header>

      <main className="dashboard-main">
        <Routes>
          <Route index element={role === 'student' ? <StudentHome /> : <AdminHome />} />
          <Route path="*" element={role === 'student' ? <StudentPage path={location.pathname} /> : <AdminPage path={location.pathname} />} />
        </Routes>
      </main>
    </div>
  </div>
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div> }
function StatCard({ label, value, note, tone, icon: Icon }: { label: string; value: string; note: string; tone: string; icon?: typeof Activity }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span>{Icon && <Icon size={18} />}</div><strong>{value}</strong><small>{note}</small></div> }
function StudentHome() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([studentDashboardService.getProfile(), attendanceService.getOverview()])
      .then(([studentProfile, attendanceSummary]) => {
        if (!cancelled) {
          setProfile(studentProfile)
          setAttendance(attendanceSummary)
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load your dashboard.')
      })
    return () => { cancelled = true }
  }, [])

  const displayName = profile?.full_name ?? 'Student'
  const roomLabel = profile?.room_number ?? 'Not allocated'
  const attendanceValue = attendance ? `${attendance.attendance_percentage}%` : '—'
  const presentValue = attendance?.present_days ?? 0
  const absentValue = attendance?.absent_days ?? 0
  const totalValue = attendance?.total_days ?? 0
  const presentWidth = attendance && attendance.total_days > 0 ? (attendance.present_days / attendance.total_days) * 100 : 0

  return <>
    <div className="dashboard-welcome">
      <div>
        <span className="eyebrow">MONDAY · SMARTSTAY</span>
        <h1>Good morning, {displayName.split(' ')[0]} <span>👋</span></h1>
        <p>A clear snapshot of your hostel life, requests and daily essentials.</p>
      </div>
      <div className="welcome-actions">
        <button className="quick-action secondary" onClick={() => navigate('/student/attendance')}><ClipboardCheck size={16} /> Attendance</button>
        <button className="quick-action primary" onClick={() => navigate('/student/complaints')}><Plus size={16} /> New request</button>
      </div>
    </div>

    {error && <div className="dashboard-alert"><AlertCircle size={17} /><span>{error}</span></div>}

    <div className="stats-grid student-stat-grid">
      <StatCard label="Attendance" value={attendanceValue} note={attendance ? `${presentValue} present of ${totalValue} recorded days` : 'Loading your attendance'} tone="mint" icon={ClipboardCheck} />
      <StatCard label="Room" value={roomLabel} note={profile ? profile.status.replace('_', ' ') : 'Loading room status'} tone="coral" icon={BedDouble} />
      <StatCard label="Course" value={profile?.course ?? '—'} note={profile?.year ?? 'Loading academic details'} tone="blue" icon={FileText} />
      <StatCard label="Student ID" value={profile?.student_id ?? '—'} note={profile?.email ?? 'Loading profile'} tone="amber" icon={UserRound} />
    </div>

    <div className="dashboard-grid hero-dashboard-grid">
      <section className="panel room-card student-room-card">
        <div className="room-top">
          <div>
            <div className="eyebrow light">YOUR ROOM</div>
            <h2>{roomLabel}</h2>
            <p>{profile ? `${profile.gender} · ${profile.status.replace('_', ' ')} · SmartStay residence` : 'Loading room information'}</p>
          </div>
          <span className="room-illustration"><BedDouble size={31} /></span>
        </div>
        <div className="room-occupancy-pill"><span><i className="dot mint" /> Current allocation</span><strong>{profile?.room_number ? 'Active' : 'Pending'}</strong></div>
        <div className="room-detail-mini-grid">
          <div><span>Student ID</span><strong>{profile?.student_id ?? '—'}</strong></div>
          <div><span>Phone</span><strong>{profile?.phone ?? '—'}</strong></div>
        </div>
        <Link className="panel-link light-link" to="/student/room">View room details <ArrowRight size={15} /></Link>
      </section>

      <section className="panel announcements">
        <div className="panel-heading">
          <div><span className="eyebrow">KEEP IN THE LOOP</span><h2>Campus updates</h2></div>
          <Link to="/student/notifications">View all <ArrowRight size={15} /></Link>
        </div>
        <div className="announcement-list">
          {announcements.slice(0, 3).map((item) => <div className="announcement" key={item.title}>
            <span className="announcement-icon"><Bell size={16} /></span>
            <div>
              <div className="item-meta"><Badge tone={item.tag === 'Maintenance' ? 'amber' : 'soft'}>{item.tag}</Badge><span>{item.date}</span></div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </div>)}
        </div>
      </section>
    </div>

    <div className="dashboard-grid lower">
      <section className="panel attendance-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">ACADEMIC PULSE</span><h2>Attendance overview</h2></div>
          <Link to="/student/attendance">Open records <ArrowRight size={15} /></Link>
        </div>
        <div className="attendance-pulse">
          <div className="big-ring"><strong>{attendanceValue}</strong><small>overall</small></div>
          <div className="pulse-bars">
            <div><span>Present</span><strong>{presentValue} days</strong><i><b style={{ width: `${presentWidth}%` }} /></i></div>
            <div><span>Absent</span><strong>{absentValue} days</strong><i><b className="coral-fill" style={{ width: `${totalValue ? (absentValue / totalValue) * 100 : 0}%` }} /></i></div>
          </div>
        </div>
      </section>

      <section className="panel profile-summary-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">YOUR PROFILE</span><h2>Account snapshot</h2></div>
          <Link to="/student/profile">View profile <ArrowRight size={15} /></Link>
        </div>
        <div className="profile-summary">
          <span className="profile-summary-avatar">{displayName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</span>
          <div><strong>{displayName}</strong><span>{profile?.course ?? 'Course'} · {profile?.year ?? 'Year'}</span><small>{profile?.email ?? 'Loading email'}</small></div>
        </div>
        <div className="profile-chip-row"><Badge tone="soft">{profile?.status ?? 'Loading'}</Badge>{profile?.room_number && <Badge tone="mint">Room allocated</Badge>}</div>
        <div className="mini-actions">
          <button onClick={() => navigate('/student/profile')}><UserRound size={15} /> Profile</button>
          <button onClick={() => navigate('/student/record')}><FileText size={15} /> My record</button>
        </div>
      </section>
    </div>

    <section className="panel quick-links-panel">
      <div className="panel-heading"><div><span className="eyebrow">SHORTCUTS</span><h2>Get things done</h2></div><Sparkles size={18} className="section-icon" /></div>
      <div className="quick-links-grid">
        {[['Complaints', MessageSquare, '/student/complaints', 'Report an issue'], ['Leave request', CalendarDays, '/student/leave', 'Plan time away'], ['Visitors', Users, '/student/visitors', 'Register a guest'], ['Payments', WalletCards, '/student/payments', 'View your fees']].map(([label, Icon, path, copy]) => {
          const QuickIcon = Icon as typeof Activity
          return <button className="quick-link-card" key={String(label)} onClick={() => navigate(String(path))}>
            <span className="quick-link-icon"><QuickIcon size={17} /></span>
            <span><strong>{String(label)}</strong><small>{String(copy)}</small></span><ArrowRight size={15} />
          </button>
        })}
      </div>
    </section>
  </>
}

function StudentPage({ path }: { path: string }) { const title = path.split('/').pop() ?? ''; if (title === 'profile') return <StudentProfilePage />; if (title === 'record') return <StudentManagement mode="student" />; if (title === 'room') return <RoomManagement mode="student" />; if (title === 'complaints') return <ComplaintPage mode="student" />; if (title === 'attendance') return <AttendancePage />; if (title === 'mess') return <MessPage />; if (title === 'leave') return <LeavePage />; if (title === 'visitors') return <VisitorsPage />; if (title === 'payments') return <PaymentsPage />; if (title === 'notifications') return <NotificationsPage />; return <GenericPage title={title} /> }

function StudentProfilePage() {
  const [profile, setProfile] = useState<Student | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    studentDashboardService.getProfile()
      .then((studentProfile) => { if (!cancelled) setProfile(studentProfile) })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load your profile.') })
    return () => { cancelled = true }
  }, [])
  return <><PageHeader eyebrow="YOUR SMARTSTAY" title="My profile" copy="Your student information from the SmartStay database." />
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!profile ? <section className="panel empty-state"><span className="spark"><UserRound size={20} /></span><h2>Loading your profile...</h2><p>We’re securely loading your student record.</p></section> :
    <section className="room-detail-grid">
      <section className="panel room-detail-hero"><div className="room-number">{profile.student_id}</div><Badge tone="mint">{profile.status.replace('_', ' ')}</Badge><p>{profile.full_name}</p><div className="room-detail-stats"><span><small>Email</small><strong>{profile.email}</strong></span><span><small>Course</small><strong>{profile.course}</strong></span><span><small>Year</small><strong>{profile.year}</strong></span></div></section>
      <section className="panel"><div className="panel-heading"><h2>Personal details</h2><UserRound size={19} /></div><div className="facilities"><div><UserRound size={17} />{profile.full_name}</div><div><ShieldCheck size={17} />{profile.email}</div><div><MessageSquare size={17} />{profile.phone}</div><div><Building2 size={17} />{profile.room_number ?? 'No room allocated'}</div><div><FileText size={17} />{profile.gender}</div></div></section>
    </section>}
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

function MessPage() { const [feedback, setFeedback] = useState(false); return <><PageHeader eyebrow="FUEL FOR YOUR DAY" title="Mess management" copy="See what’s cooking and let the team know how it felt." action={<Button onClick={() => setFeedback(!feedback)}><MessageSquare size={17} /> Give feedback</Button>} /><section className="menu-highlight"><div><span className="eyebrow">TODAY · WEDNESDAY</span><h2>Comfort food, with a little <em>crunch.</em></h2><p>Fresh, balanced meals planned by the campus mess team.</p></div><Utensils size={72} strokeWidth={1.2} /></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">WEEKLY MENU</span><h2>What’s on the table</h2></div></div><div className="menu-table"><div className="menu-head"><span>Day</span><span>Breakfast</span><span>Lunch</span><span>Snacks</span><span>Dinner</span></div>{menu.map((day) => <div className="menu-row" key={day.day}><strong>{day.day}</strong>{day.meals.map((meal) => <span key={meal}>{meal}</span>)}</div>)}</div></section>{feedback && <div className="inline-feedback"><Check size={17} /> Thanks for helping improve the mess experience. <button onClick={() => setFeedback(false)}><X size={15} /></button></div>}</> }
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
  return <><PageHeader eyebrow="WARDEN WORKSPACE" title={key.charAt(0).toUpperCase() + key.slice(1)} copy="A prepared operations view for your hostel team." action={<Button><Plus size={17} /> New action</Button>} /><section className="panel admin-table"><div className="toolbar"><SearchInput placeholder="Search this workspace" /><Badge tone="soft">Mock data</Badge></div>{key === 'allocations' ? <DataTable headers={['Room', 'Block', 'Type', 'Occupants', 'Status']} rows={rooms.map((x) => [x.room, x.block, x.type, x.occupants, x.status])} /> : key === 'maintenance' ? <DataTable headers={['Asset', 'Location', 'Last maintenance', 'Complaints', 'Status']} rows={maintenance.map((x) => [x.asset, x.location, x.last, String(x.complaints), x.status])} /> : <div className="empty-state"><span className="spark"><Settings size={20} /></span><h2>Clearer operations start here.</h2><p>This module is ready for local mock interactions and future FastAPI service integration.</p></div>}</section></>
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={cell}>{j === 0 ? <strong>{cell}</strong> : j === row.length - 1 ? <Badge tone={cell === 'Active' || cell === 'Occupied' || cell === 'Resolved' || cell === 'Healthy' ? 'mint' : 'amber'}>{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div> }
function AdminHome() { return <><PageHeader eyebrow="MONDAY, SEPTEMBER 14, 2026" title="Good morning, Rhea." copy="Here’s the operational pulse across your hostels." action={<Button><Plus size={17} /> New announcement</Button>} /><div className="stats-grid">{stats.admin.map((item, i) => <StatCard key={item.label} {...item} icon={[Users, BedDouble, MessageSquare, CalendarDays][i]} />)}</div><div className="dashboard-grid"><section className="panel occupancy-panel"><div className="panel-heading"><div><span className="eyebrow">CAPACITY SNAPSHOT</span><h2>Room occupancy</h2></div><Link to="/admin/rooms">Manage rooms <ArrowRight size={15} /></Link></div><div className="occupancy-main"><div className="admin-ring"><strong>82%</strong><small>occupied</small></div><div className="legend"><span><i className="dot mint" />Occupied <strong>386</strong></span><span><i className="dot blue" />Available <strong>68</strong></span><span><i className="dot coral" />Maintenance <strong>14</strong></span></div></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Latest complaints</h2></div><Link to="/admin/complaints">View all <ArrowRight size={15} /></Link></div>{complaints.slice(0, 3).map((x) => <div className="compact-issue" key={x.id}><span className="issue-icon amber-bg"><AlertCircle size={16} /></span><div><strong>{x.subject}</strong><small>{x.id} · {x.date}</small></div><Badge tone={x.status === 'Resolved' ? 'mint' : 'amber'}>{x.status}</Badge></div>)}</section></div><div className="dashboard-grid lower"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">OPERATIONS</span><h2>Complaint trend</h2></div></div><div className="bar-chart">{[42, 54, 48, 67, 59, 82].map((height, i) => <div key={i}><span style={{ height: `${height}%` }} /><small>{['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i]}</small></div>)}</div></section><section className="panel ai-panel"><div className="ai-head"><span className="spark"><Sparkles size={17} /></span><div><Badge tone="dark">DEMO AI INSIGHTS</Badge><h2>Signals worth a closer look.</h2></div></div><p>Block B has shown an increase in maintenance complaints this month.</p><p>Expected occupancy may increase next month.</p><small><Sparkles size={13} /> ML service will be connected later.</small></section></div></> }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={close}><X size={18} /></button></div>{children}</div></div> }

export default App
