import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, BedDouble, Bell, Building2, CalendarDays, Check, ClipboardCheck, DoorOpen, FileText, Home, LayoutDashboard, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Stethoscope, UserRound, Users, Utensils, WalletCards, X } from 'lucide-react'
import { announcements, complaints, leaveRequests, maintenance, menu, rooms, stats, visitors, type Role } from './data'
import { attendanceService, complaintService, getCurrentUser, loginUser, logoutUser, roomService, studentDashboardService, studentService, type AttendanceRecord, type AttendanceSummary, type Complaint, type ComplaintCategory, type ComplaintPriority, type ComplaintStatus, type Student } from './services'
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

function Landing() {
  const navigate = useNavigate()
  const cards = [
    [Building2, 'Rooms & allocations', 'Know every bed, room and vacancy.'],
    [ClipboardCheck, 'Attendance', 'Track presence without paperwork.'],
    [MessageSquare, 'Complaints', 'Move issues from report to resolution.'],
    [CalendarDays, 'Leave & visitors', 'Keep requests visible and organized.'],
  ]
  return <div className="landing landing-v3">
    <nav className="landing-nav landing-nav-v3">
      <Link className="brand landing-brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link>
      <div className="landing-links"><a href="#features">Platform</a><a href="#flow">Workflow</a><a href="#benefits">Why SmartStay</a></div>
      <div className="nav-actions"><Link className="text-button" to="/login">Sign in</Link><Button onClick={() => navigate('/login')}>Get started <ArrowRight size={16} /></Button></div>
    </nav>

    <main>
      <section className="landing-hero-v3">
        <div className="hero-copy-v3">
          <div className="hero-kicker-v3"><span className="live-pill"><i /> Live hostel operations</span><span>Built for students + wardens</span></div>
          <h1>One place to run<br /><span>every hostel day.</span></h1>
          <p>SmartStay connects rooms, attendance, complaints, leave, visitors and payments into a single, calm workspace.</p>
          <div className="hero-actions-v3">
            <Button onClick={() => navigate('/login')}>Explore SmartStay <ArrowRight size={16} /></Button>
            <Link to="/signup" className="hero-text-link">Create student account</Link>
          </div>
          <div className="trust-row-v3"><span><Check size={14} /> Faster daily operations</span><span><Check size={14} /> Real-time status</span><span><Check size={14} /> AI-ready foundation</span></div>
        </div>

        <div className="hero-dashboard-v3">
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="mock-app-v3">
            <div className="mock-top-v3">
              <div className="mock-window-dots"><i /><i /><i /></div>
              <span>SmartStay / Student workspace</span>
              <div className="mock-user">CP</div>
            </div>
            <div className="mock-body-v3">
              <aside className="mock-side-v3">
                <strong>smartstay</strong>
                <small>STUDENT</small>
                <span className="mock-active"><LayoutDashboard size={13} /> Overview</span>
                <span><BedDouble size={13} /> My room</span>
                <span><ClipboardCheck size={13} /> Attendance</span>
                <span><MessageSquare size={13} /> Complaints</span>
                <span><CalendarDays size={13} /> Leave</span>
                <div className="mock-side-bottom"><Sparkles size={13} /> AI insights</div>
              </aside>
              <div className="mock-main-v3">
                <div className="mock-greeting"><div><small>MONDAY · SMARTSTAY</small><h3>Good morning, Cherishma <span>👋</span></h3></div><span className="mock-avatar-v3">CP</span></div>
                <div className="mock-stats-v3">
                  <div><small>Attendance</small><strong>92.4%</strong><span className="mini-progress"><b style={{ width: '92%' }} /></span><em>+2.4% this month</em></div>
                  <div><small>My room</small><strong>B-204</strong><em>2 / 2 beds occupied</em></div>
                  <div><small>Open requests</small><strong>03</strong><em>1 needs attention</em></div>
                </div>
                <div className="mock-grid-v3">
                  <div className="mock-card-v3 chart-card-v3">
                    <div className="mock-card-head-v3"><span>Attendance overview</span><small>Last 7 days</small></div>
                    <div className="mock-chart-v3">{[45,63,54,76,62,88,78].map((h,i)=><i key={i} style={{height: `${h}%`}} />)}</div>
                    <div className="mock-axis-v3"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  </div>
                  <div className="mock-card-v3 activity-card-v3">
                    <div className="mock-card-head-v3"><span>Latest activity</span><Bell size={13} /></div>
                    <div className="mock-activity-v3"><span className="activity-icon"><MessageSquare size={12} /></span><div><strong>CMP-0004</strong><small>AC repair request</small></div><Badge tone="mint">IN PROGRESS</Badge></div>
                    <div className="mock-activity-v3"><span className="activity-icon blue"><CalendarDays size={12} /></span><div><strong>Leave request</strong><small>Sep 18 – Sep 20</small></div><Badge tone="amber">PENDING</Badge></div>
                    <div className="mock-activity-v3"><span className="activity-icon purple"><Bell size={12} /></span><div><strong>Announcement</strong><small>Block B inspection</small></div><Badge tone="soft">NEW</Badge></div>
                  </div>
                </div>
                <div className="mock-shortcuts-v3">{cards.map(([Icon,title,copy])=>{const CardIcon=Icon as typeof Activity;return <div key={String(title)}><span><CardIcon size={14}/></span><div><strong>{String(title)}</strong><small>{String(copy)}</small></div><ArrowRight size={13}/></div>})}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section landing-section-v3">
        <div className="section-heading-v3"><span className="section-kicker">THE SMARTSTAY PLATFORM</span><h2>Everything your hostel team needs,<br /><em>in one operating layer.</em></h2><p>Designed around the workflows that students use every day and the information wardens need to act quickly.</p></div>
        <div className="feature-grid feature-grid-v3">{cards.concat([[WalletCards,'Payments & records','Keep fees, records and updates together.'],[Sparkles,'Analytics & AI','Turn hostel data into useful decisions.']]).map(([Icon,title,copy],i)=>{const FeatureIcon=Icon as typeof Activity;return <div className="feature feature-v3" key={String(title)}><div className="feature-top-v3"><span>0{i+1}</span><span className="feature-icon"><FeatureIcon size={18}/></span></div><h3>{String(title)}</h3><p>{String(copy)}</p><ArrowRight size={15}/></div>})}</div>
      </section>

      <section id="flow" className="flow-band flow-band-v3">
        <div className="section-heading-v3 light-heading"><span className="section-kicker">HOW IT WORKS</span><h2>From request to resolution,<br /><em>without the chaos.</em></h2></div>
        <div className="flow flow-v3">{[['01','Capture','Requests, attendance and room data enter one workspace.'],['02','Coordinate','Wardens see priorities, ownership and status at a glance.'],['03','Resolve','Every update stays visible until the work is complete.'],['04','Learn','Analytics and AI can turn history into smarter action.']].map(([n,t,d])=><div key={n}><span>{n}</span><strong>{t}</strong><small>{d}</small></div>)}</div>
      </section>

      <section id="benefits" className="benefits section benefits-v3">
        <div><span className="section-kicker">MADE FOR CAMPUS LIFE</span><h2>Less admin noise.<br /><em>More time for people.</em></h2><p>SmartStay gives students clarity and gives hostel teams a single source of truth for daily operations.</p><Button onClick={() => navigate('/login')}>Enter the workspace <ArrowRight size={16} /></Button></div>
        <div className="benefit-list benefit-list-v3">{['One source of truth','Faster issue resolution','Clear room & attendance visibility','Better communication','AI-ready hostel data'].map((x,i)=><div key={x}><span>0{i+1}</span><strong>{x}</strong><Check size={16}/></div>)}</div>
      </section>
    </main>

    <footer className="landing-footer-v3"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><span>Hostel operations, made human.</span><span>© 2026 SmartStay</span></footer>
  </div>
}

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

  const groups = role === 'student'
    ? [
        { label: 'Overview', items: pages.slice(0, 1) },
        { label: 'My stay', items: pages.slice(1, 5) },
        { label: 'Services', items: pages.slice(5, 9) },
        { label: 'Finance & updates', items: pages.slice(9) },
      ]
    : [
        { label: 'Overview', items: pages.slice(0, 1) },
        { label: 'People & spaces', items: pages.slice(1, 4) },
        { label: 'Operations', items: pages.slice(4, 10) },
        { label: 'Finance & communication', items: pages.slice(10, 12) },
        { label: 'Insights', items: pages.slice(12) },
      ]

  return <div className="app-shell">
    <div className={open ? 'mobile-scrim show' : 'mobile-scrim'} onClick={() => setOpen(false)} />
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="side-brand"><Link className="brand" to="/"><span className="brand-mark"><Building2 size={17} /></span> smart<span>stay</span></Link><button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <div className="workspace-switcher"><span className="workspace-icon">{role === 'student' ? <UserRound size={16} /> : <ShieldCheck size={16} />}</span><span><small>{role === 'student' ? 'PERSONAL SPACE' : 'OPERATIONS SPACE'}</small><strong>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</strong></span><span className="workspace-status-dot" /></div>
      <nav className="side-nav side-nav-grouped">
        {groups.map((group) => <div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.items.map(({ label, icon: Icon, path }) => <NavLink onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''} to={path} key={path} end={path === '/student' || path === '/admin'}><span className="nav-icon"><Icon size={17} /></span><span>{label}</span>{label === 'Notifications' && <span className="nav-count">3</span>}</NavLink>)}</div>)}
      </nav>
      <div className="side-bottom">
        <div className="help-card premium-help"><span className="help-icon"><Sparkles size={16} /></span><div><strong>SmartStay AI</strong><small>Insights will appear here as the AI layer grows.</small></div></div>
        <div className="profile-mini"><span className="avatar">{initials}</span><span className="profile-mini-copy"><strong>{currentUser?.name ?? (role === 'student' ? 'Student' : 'Administrator')}</strong><small>{currentUser?.email ?? (role === 'student' ? 'Student account' : 'Admin account')}</small></span><button className="profile-menu" aria-label="Account menu"><MoreHorizontal size={17} /></button></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="app-header"><div className="header-left"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="breadcrumb"><span>{role === 'student' ? 'Student workspace' : 'Warden workspace'}</span><ArrowRight size={13} /><strong>{current.label}</strong></div></div><div className="header-actions"><SearchInput placeholder="Search SmartStay..." /><button className="icon-button header-notification" aria-label="Notifications" onClick={() => location.pathname.startsWith('/student') ? window.location.assign('/student/notifications') : window.location.assign('/admin/notifications')}><Bell size={18} /><i /></button><div className="header-avatar" title={currentUser?.name ?? ''}>{initials}</div></div></header>
      <main className="dashboard-main"><Routes><Route index element={role === 'student' ? <StudentHome /> : <AdminHome />} /><Route path="*" element={role === 'student' ? <StudentPage path={location.pathname} /> : <AdminPage path={location.pathname} />} /></Routes></main>
    </div>
  </div>
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{action}</div> }
function StatCard({ label, value, note, tone, icon: Icon }: { label: string; value: string; note: string; tone: string; icon?: typeof Activity }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span>{Icon && <Icon size={18} />}</div><strong>{value}</strong><small>{note}</small></div> }
function StudentHome() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([studentDashboardService.getProfile(), attendanceService.getOverview(), complaintService.getMy()])
      .then(([studentProfile, attendanceSummary, complaintRecords]) => {
        if (!cancelled) { setProfile(studentProfile); setAttendance(attendanceSummary); setRecentComplaints(complaintRecords.slice(0, 3)) }
      })
      .catch((requestError) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load your dashboard.') })
    return () => { cancelled = true }
  }, [])

  const displayName = profile?.full_name ?? 'Student'
  const firstName = displayName.split(' ')[0]
  const roomLabel = profile?.room_number ?? 'Not allocated'
  const attendanceValue = attendance ? String(attendance.attendance_percentage) + '%' : '—'
  const presentValue = attendance?.present_days ?? 0
  const absentValue = attendance?.absent_days ?? 0
  const totalValue = attendance?.total_days ?? 0
  const presentWidth = attendance && attendance.total_days > 0 ? (attendance.present_days / attendance.total_days) * 100 : 0
  const openRequests = recentComplaints.filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS').length
  const complaintTone = (statusValue: ComplaintStatus) => statusValue === 'RESOLVED' || statusValue === 'CLOSED' ? 'mint' : statusValue === 'IN_PROGRESS' ? 'blue' : 'amber'

  return <>
    <div className="dashboard-welcome"><div><span className="eyebrow">STUDENT OVERVIEW</span><h1>Good morning, {firstName} <span>👋</span></h1><p>Your hostel essentials, requests and updates — all in one place.</p></div><div className="welcome-actions"><button className="quick-action secondary" onClick={() => navigate('/student/attendance')}><ClipboardCheck size={16} /> View attendance</button><button className="quick-action primary" onClick={() => navigate('/student/complaints')}><Plus size={16} /> New request</button></div></div>
    {error && <div className="dashboard-alert"><AlertCircle size={17} /><span>{error}</span></div>}
    <div className="stats-grid student-stat-grid">
      <StatCard label="Attendance" value={attendanceValue} note={attendance ? presentValue + ' present of ' + totalValue + ' recorded days' : 'Loading'} tone="mint" icon={ClipboardCheck} />
      <StatCard label="My room" value={roomLabel} note={profile?.room_number ? 'Active allocation' : 'Awaiting allocation'} tone="blue" icon={BedDouble} />
      <StatCard label="Open requests" value={String(openRequests)} note={recentComplaints.length ? 'Based on your complaint activity' : 'No complaint activity yet'} tone="indigo" icon={MessageSquare} />
      <StatCard label="Status" value={profile?.status?.replace('_', ' ') ?? 'Loading'} note={profile?.year ?? 'Student account'} tone="soft" icon={ShieldCheck} />
    </div>
    <div className="student-dashboard-grid top-grid">
      <section className="panel attendance-card"><div className="panel-heading"><div><span className="eyebrow">ACADEMIC PULSE</span><h2>Attendance overview</h2></div><Link to="/student/attendance">View records <ArrowRight size={15} /></Link></div><div className="attendance-main"><div className="attendance-score"><strong>{attendanceValue}</strong><span>overall attendance</span><small>{presentValue} present · {absentValue} absent</small></div><div className="attendance-bars"><div><span><b>Present</b><strong>{presentValue} days</strong></span><i><b style={{ width: presentWidth + '%' }} /></i></div><div><span><b>Absent</b><strong>{absentValue} days</strong></span><i className="bar-muted"><b style={{ width: (totalValue ? (absentValue / totalValue) * 100 : 0) + '%' }} /></i></div></div></div></section>
      <section className="panel room-overview-card"><div className="panel-heading"><div><span className="eyebrow">MY ROOM</span><h2>{roomLabel}</h2></div><span className="room-icon-soft"><BedDouble size={22} /></span></div><div className="room-overview-meta"><span>Allocation</span><strong>{profile?.room_number ? 'Active' : 'Pending'}</strong></div><div className="room-facts"><div><small>Student ID</small><strong>{profile?.student_id ?? '—'}</strong></div><div><small>Phone</small><strong>{profile?.phone ?? 'Not provided'}</strong></div></div><Link className="soft-link" to="/student/room">View room details <ArrowRight size={15} /></Link></section>
    </div>
    <div className="student-dashboard-grid lower-grid">
      <section className="panel requests-card"><div className="panel-heading"><div><span className="eyebrow">REQUESTS</span><h2>Recent requests</h2></div><Link to="/student/complaints">View all <ArrowRight size={15} /></Link></div>{recentComplaints.length === 0 ? <div className="dashboard-empty"><MessageSquare size={21} /><strong>No requests yet</strong><span>Raise a complaint and it will appear here.</span><button className="text-button-blue" onClick={() => navigate('/student/complaints')}>Create request</button></div> : <div className="request-list-v2">{recentComplaints.map((item) => <div className="request-row-v2" key={item.id}><span className="request-icon"><MessageSquare size={15} /></span><div><strong>{item.complaint_number} · {item.title}</strong><small>{item.category} · {new Date(item.created_at).toLocaleDateString()}</small></div><Badge tone={complaintTone(item.status)}>{item.status.replace('_', ' ')}</Badge></div>)}</div>}</section>
      <section className="panel updates-card"><div className="panel-heading"><div><span className="eyebrow">CAMPUS UPDATES</span><h2>What’s happening</h2></div><Link to="/student/notifications">View all <ArrowRight size={15} /></Link></div><div className="updates-list">{announcements.slice(0, 3).map((item) => <div className="update-row-v2" key={item.title}><span className="update-icon"><Bell size={15} /></span><div><div><strong>{item.title}</strong><Badge tone={item.tag === 'Maintenance' ? 'amber' : 'soft'}>{item.tag}</Badge></div><small>{item.body}</small><em>{item.date}</em></div></div>)}</div></section>
    </div>
    <section className="panel quick-links-panel"><div className="panel-heading"><div><span className="eyebrow">SHORTCUTS</span><h2>Get things done</h2></div><span className="section-icon"><Sparkles size={17} /></span></div><div className="quick-links-grid">{[['Complaints', MessageSquare, '/student/complaints', 'Report an issue'], ['Leave request', CalendarDays, '/student/leave', 'Plan time away'], ['Visitors', Users, '/student/visitors', 'Register a guest'], ['Payments', WalletCards, '/student/payments', 'View fees and transactions']].map(([label, Icon, path, copy]) => { const QuickIcon = Icon as typeof Activity; return <button className="quick-link-card" key={String(label)} onClick={() => navigate(String(path))}><span className="quick-link-icon"><QuickIcon size={17} /></span><span><strong>{String(label)}</strong><small>{String(copy)}</small></span><ArrowRight size={15} /></button> })}</div></section>
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
function AdminHome() {
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [roomCount, setRoomCount] = useState<number | null>(null)
  const [pendingComplaints, setPendingComplaints] = useState<Complaint[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([studentService.list(), roomService.list(), complaintService.getAll()])
      .then(([students, roomsList, complaintsList]) => {
        if (!cancelled) {
          setStudentCount(students.length)
          setRoomCount(roomsList.length)
          setPendingComplaints(complaintsList.filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS').slice(0, 4))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return <>
    <div className="dashboard-welcome"><div><span className="eyebrow">WARDEN OVERVIEW</span><h1>Good morning, Rhea <span>👋</span></h1><p>Your operational snapshot across students, rooms and requests.</p></div><div className="welcome-actions"><button className="quick-action secondary" onClick={() => window.location.assign('/admin/rooms')}><BedDouble size={16} /> Manage rooms</button><button className="quick-action primary" onClick={() => window.location.assign('/admin/announcements')}><Plus size={16} /> New announcement</button></div></div>
    <div className="stats-grid admin-stat-grid">
      <StatCard label="Students" value={studentCount === null ? '—' : String(studentCount)} note="Student records" tone="blue" icon={Users} />
      <StatCard label="Rooms" value={roomCount === null ? '—' : String(roomCount)} note="Managed rooms" tone="soft" icon={BedDouble} />
      <StatCard label="Open complaints" value={pendingComplaints.length === 0 && studentCount === null ? '—' : String(pendingComplaints.length)} note="Needs attention" tone="indigo" icon={MessageSquare} />
      <StatCard label="Notifications" value="3" note="Unread updates" tone="mint" icon={Bell} />
    </div>
    <div className="admin-dashboard-grid">
      <section className="panel occupancy-card-v2"><div className="panel-heading"><div><span className="eyebrow">CAPACITY</span><h2>Room overview</h2></div><Link to="/admin/rooms">Open room management <ArrowRight size={15} /></Link></div><div className="admin-room-summary"><div className="admin-room-summary-icon"><BedDouble size={25} /></div><div><strong>{roomCount === null ? 'Loading…' : String(roomCount) + ' rooms'}</strong><span>Manage capacity, occupancy and allocations from the Rooms workspace.</span></div><Link className="soft-link" to="/admin/rooms">Manage rooms <ArrowRight size={15} /></Link></div></section>
      <section className="panel admin-attention-card"><div className="panel-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Recent complaints</h2></div><Link to="/admin/complaints">View all <ArrowRight size={15} /></Link></div>{pendingComplaints.length === 0 ? <div className="dashboard-empty"><Check size={20} /><strong>Nothing urgent right now</strong><span>Open or in-progress complaints will appear here.</span></div> : <div className="request-list-v2">{pendingComplaints.map((item) => <div className="request-row-v2" key={item.id}><span className="request-icon"><AlertCircle size={15} /></span><div><strong>{item.complaint_number} · {item.title}</strong><small>{item.category} · {item.priority}</small></div><Badge tone={item.priority === 'URGENT' || item.priority === 'HIGH' ? 'coral' : item.status === 'IN_PROGRESS' ? 'blue' : 'amber'}>{item.status.replace('_', ' ')}</Badge></div>)}</div>}</section>
    </div>
    <div className="admin-dashboard-grid lower-admin">
      <section className="panel admin-operations-card"><div className="panel-heading"><div><span className="eyebrow">OPERATIONS HUB</span><h2>Common actions</h2></div><Activity size={17} /></div><div className="admin-action-grid">{[['Students', Users, '/admin/students'], ['Rooms', BedDouble, '/admin/rooms'], ['Attendance', ClipboardCheck, '/admin/attendance'], ['Complaints', MessageSquare, '/admin/complaints'], ['Leave', CalendarDays, '/admin/leave'], ['Visitors', Users, '/admin/visitors']].map(([label, Icon, path]) => { const ActionIcon = Icon as typeof Activity; return <button className="admin-action-card" key={String(label)} onClick={() => window.location.assign(String(path))}><span><ActionIcon size={16} /></span><div><strong>{String(label)}</strong><small>Open workspace</small></div><ArrowRight size={14} /></button> })}</div></section>
      <section className="panel admin-ai-card"><div className="ai-card-head"><span><Sparkles size={18} /></span><div><span className="eyebrow">AI-READY</span><h2>SmartStay intelligence</h2></div></div><p>The core workspace is being connected first. Complaint classification, predictive maintenance and occupancy insights can plug into this layer without changing your workflow.</p><div className="ai-feature-row"><span>01</span><strong>Complaint classification</strong></div><div className="ai-feature-row"><span>02</span><strong>Predictive maintenance</strong></div><div className="ai-feature-row"><span>03</span><strong>Occupancy forecasting</strong></div></section>
    </div>
  </>
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={close}><X size={18} /></button></div>{children}</div></div> }

export default App
