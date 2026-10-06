import { students } from './data'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const AUTH_TOKEN_KEY = 'smartstay_access_token'

export type AuthRole = 'STUDENT' | 'ADMIN'

export type AuthUser = {
	id: number
	name: string
	email: string
	role: AuthRole
	created_at: string
}

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'

export type Student = {
	id: number
	student_id: string
	full_name: string
	email: string
	phone: string
	course: string
	year: string
	gender: string
	room_number: string | null
	status: StudentStatus
	created_at: string
	updated_at: string
}

export type StudentInput = Omit<Student, 'id' | 'created_at' | 'updated_at'>

export type RoomStatus = 'AVAILABLE' | 'PARTIALLY_OCCUPIED' | 'FULL' | 'MAINTENANCE'

export type Room = {
	id: number
	room_number: string
	block: string
	floor: number
	room_type: string
	capacity: number
	occupied_beds: number
	available_beds: number
	status: RoomStatus
	created_at: string
	updated_at: string
}

// The API initializes a new room with zero occupied beds.  Keeping that field
// optional here prevents the UI from inventing occupancy before an allocation.
export type RoomInput = Omit<Room, 'id' | 'available_beds' | 'created_at' | 'updated_at' | 'occupied_beds'> & {
	occupied_beds?: number
}
export type RoomUpdateInput = Omit<RoomInput, 'room_number'>

type LoginResponse = {
	access_token: string
	token_type: string
	user: AuthUser
}

function displayNameFromEmail(email: string): string {
	const localPart = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
	return localPart.length >= 2 ? localPart : 'SmartStay Student'
}

function normalizeAuthEmail(email: string): string {
	return email.trim().toLowerCase()
}

async function getErrorMessage(response: Response): Promise<string> {
	const body = await response.json().catch(() => null) as { detail?: string | { msg?: string }[] } | null
	if (typeof body?.detail === 'string') return body.detail
	if (Array.isArray(body?.detail)) return body.detail.map((error) => error.msg).filter(Boolean).join(', ')
	return 'The server could not process your request.'
}

async function authenticatedRequest<T>(resource: 'students' | 'rooms', path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/${resource}${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		if (response.status === 403) throw new Error('You do not have permission to perform this action.')
		throw new Error(await getErrorMessage(response))
	}
	if (response.status === 204) return undefined as T
	return response.json() as Promise<T>
}

async function studentRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	return authenticatedRequest<T>('students', path, options)
}

async function roomRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	return authenticatedRequest<T>('rooms', path, options)
}

export const studentManagementService = {
	list: (search = '') => studentRequest<Student[]>(search ? `?search=${encodeURIComponent(search)}` : ''),
	get: (studentId: string) => studentRequest<Student>(`/${encodeURIComponent(studentId)}`),
	create: (student: StudentInput) => studentRequest<Student>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student) }),
	update: (studentId: string, student: StudentInput) => studentRequest<Student>(`/${encodeURIComponent(studentId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student) }),
	remove: (studentId: string) => studentRequest<void>(`/${encodeURIComponent(studentId)}`, { method: 'DELETE' }),
	getProfile: () => studentRequest<Student>('/profile'),
	updateProfile: (input: Pick<Student, 'full_name' | 'phone' | 'course' | 'year' | 'gender'>) => studentRequest<Student>('/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
}

export const listRooms = (search = '', status?: RoomStatus) => {
	const params = new URLSearchParams()
	if (search) params.set('search', search)
	if (status) params.set('status', status)
	const query = params.toString()
	return roomRequest<Room[]>(query ? `?${query}` : '')
}

export const getRoom = (roomNumber: string) => roomRequest<Room>(`/${encodeURIComponent(roomNumber)}`)
export const createRoom = (room: RoomInput) => roomRequest<Room>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(room) })
export const updateRoom = (roomNumber: string, room: RoomUpdateInput) => roomRequest<Room>(`/${encodeURIComponent(roomNumber)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(room) })
export const deleteRoom = (roomNumber: string) => roomRequest<void>(`/${encodeURIComponent(roomNumber)}`, { method: 'DELETE' })
export const allocateStudentToRoom = (roomNumber: string, studentId: string) => roomRequest<Room>(`/${encodeURIComponent(roomNumber)}/allocate/${encodeURIComponent(studentId)}`, { method: 'POST' })
export const deallocateStudentFromRoom = (roomNumber: string, studentId: string) => roomRequest<Room>(`/${encodeURIComponent(roomNumber)}/deallocate/${encodeURIComponent(studentId)}`, { method: 'POST' })

export const roomManagementService = {
	list: listRooms,
	get: getRoom,
	create: createRoom,
	update: updateRoom,
	remove: deleteRoom,
	allocate: allocateStudentToRoom,
	deallocate: deallocateStudentFromRoom,
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
	const body = new URLSearchParams({ username: normalizeAuthEmail(email), password })
	const controller = new AbortController()
	const timeout = window.setTimeout(() => controller.abort(), 10000)
	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
			signal: controller.signal,
		})
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error('The backend did not respond in time. Check that SmartStay is running and try again.')
		}
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	} finally {
		window.clearTimeout(timeout)
	}

	if (!response.ok) throw new Error(await getErrorMessage(response))

	const loginResponse = await response.json() as LoginResponse
	sessionStorage.setItem(AUTH_TOKEN_KEY, loginResponse.access_token)
	return loginResponse.user
}

export async function registerUser(email: string, password: string): Promise<void> {
	const normalizedEmail = normalizeAuthEmail(email)
	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: displayNameFromEmail(normalizedEmail), email: normalizedEmail, password }),
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) throw new Error(await getErrorMessage(response))
}

export async function getCurrentUser(): Promise<AuthUser> {
	const token = sessionStorage.getItem(AUTH_TOKEN_KEY)
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
		})
	} catch {
		throw new Error('Unable to verify your session. Check that the backend is running and try again.')
	}

	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		throw new Error(await getErrorMessage(response))
	}

	return response.json() as Promise<AuthUser>
}

export function getAuthToken(): string | null {
	return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function logoutUser(): void {
	sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

export { studentManagementService as studentService }

export type AttendanceStatus = 'PRESENT' | 'ABSENT'

export type AttendanceRecord = {
	id: number
	student_id: number
	attendance_date: string
	status: AttendanceStatus
	created_at: string
	updated_at: string
}

export type Attendance = AttendanceRecord

export type AttendanceSummary = {
	total_days: number
	present_days: number
	absent_days: number
	attendance_percentage: number
}

async function attendanceRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/attendance${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		if (response.status === 403) throw new Error('You do not have permission to view this attendance data.')
		throw new Error(await getErrorMessage(response))
	}
	if (response.status === 204) return undefined as T
	return response.json() as Promise<T>
}

export const studentDashboardService = {
	getProfile: async (): Promise<Student | null> => {
		const records = await studentManagementService.list()
		return records[0] ?? null
	},
	getAnnouncements: async () => Promise.resolve([]),
}

export { roomManagementService as roomService }

export type ComplaintCategory = 'MAINTENANCE' | 'MESS' | 'ROOM' | 'INTERNET' | 'SECURITY' | 'ACADEMIC' | 'HOSTEL' | 'OTHER'
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export type Complaint = {
	id: number
	complaint_number: string
	student_id: number
	room_number: string | null
	title: string
	description: string
	category: ComplaintCategory
	priority: ComplaintPriority
	status: ComplaintStatus
	admin_note: string | null
	resolved_at: string | null
	created_at: string
	updated_at: string
}

async function complaintRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/complaints${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		if (response.status === 403) throw new Error('You do not have permission to perform this action.')
		throw new Error(await getErrorMessage(response))
	}
	if (response.status === 204) return undefined as T
	return response.json() as Promise<T>
}

export const complaintService = {
	getMy: (status?: ComplaintStatus) => {
		const query = status ? `?status=${encodeURIComponent(status)}` : ''
		return complaintRequest<Complaint[]>(`/my${query}`)
	},
	getAll: (status?: ComplaintStatus) => {
		const query = status ? `?status=${encodeURIComponent(status)}` : ''
		return complaintRequest<Complaint[]>(query)
	},
	create: (input: {
		title: string
		description: string
		category: ComplaintCategory
		priority: ComplaintPriority
	}) => complaintRequest<Complaint>('', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	update: (
		complaintId: number,
		input: { status?: ComplaintStatus; priority?: ComplaintPriority; admin_note?: string | null },
	) => complaintRequest<Complaint>(`/${complaintId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	remove: (complaintId: number) => complaintRequest<void>(`/${complaintId}`, { method: 'DELETE' }),
}

export type MessServiceFeedback = {
	id: number
	student_id: number
	rating: number
	feedback: string
	created_at: string
}

async function messRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/mess${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) throw new Error(await getErrorMessage(response))
	return response.json() as Promise<T>
}

export const messService = {
	createFeedback: (input: { rating: number; feedback: string }) => messRequest<MessServiceFeedback>('/feedback', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	getMyFeedback: () => messRequest<MessServiceFeedback[]>('/feedback/my'),
}

export type VisitorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'

export type VisitorRecord = {
	id: number
	visitor_number: string
	student_id: number
	visitor_name: string
	visitor_phone: string
	relationship: string
	purpose: string
	visit_date: string
	expected_entry_time: string
	expected_exit_time: string
	status: VisitorStatus
	check_in_at: string | null
	check_out_at: string | null
	created_at: string
	updated_at: string
}

async function visitorRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/visitors${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) throw new Error(await getErrorMessage(response))
	return response.json() as Promise<T>
}

export const visitorService = {
	create: (input: Pick<VisitorRecord, 'visitor_name' | 'visitor_phone' | 'relationship' | 'purpose' | 'visit_date' | 'expected_entry_time' | 'expected_exit_time'>) => visitorRequest<VisitorRecord>('', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	my: () => visitorRequest<VisitorRecord[]>('/my'),
	list: (filters: { status?: VisitorStatus; visitDate?: string; search?: string } = {}) => {
		const params = new URLSearchParams()
		if (filters.status) params.set('status', filters.status)
		if (filters.visitDate) params.set('visit_date', filters.visitDate)
		if (filters.search) params.set('search', filters.search)
		const query = params.toString()
		return visitorRequest<VisitorRecord[]>(query ? `?${query}` : '')
	},
	decide: (id: number, status: 'APPROVED' | 'REJECTED') => visitorRequest<VisitorRecord>(`/${id}/decision`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status }),
	}),
	cancel: (id: number) => visitorRequest<VisitorRecord>(`/${id}/cancel`, { method: 'POST' }),
	checkIn: (id: number) => visitorRequest<VisitorRecord>(`/${id}/check-in`, { method: 'POST' }),
	checkOut: (id: number) => visitorRequest<VisitorRecord>(`/${id}/check-out`, { method: 'POST' }),
}

export type LeaveType = 'DAY' | 'OVERNIGHT' | 'MULTI_DAY'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type LeaveRecord = {
	id: number
	leave_number: string
	student_id: number
	leave_type: LeaveType
	start_date: string
	end_date: string
	reason: string
	status: LeaveStatus
	admin_note: string | null
	created_at: string
	updated_at: string
}

async function leaveRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')
	const response = await fetch(`${API_BASE_URL}/api/leaves${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } })
	if (!response.ok) throw new Error(await getErrorMessage(response))
	return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const leaveService = {
	my: () => leaveRequest<LeaveRecord[]>('/my'),
	create: (input: { leave_type: LeaveRecord['leave_type']; start_date: string; end_date: string; reason: string }) => leaveRequest<LeaveRecord>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
	list: (filters: { status?: LeaveRecord['status']; search?: string } = {}) => {
		const params = new URLSearchParams()
		if (filters.status) params.set('status', filters.status)
		if (filters.search) params.set('search', filters.search)
		const query = params.toString()
		return leaveRequest<LeaveRecord[]>(query ? `?${query}` : '')
	},
	decide: (id: number, status: 'APPROVED' | 'REJECTED', admin_note?: string) => leaveRequest<LeaveRecord>(`/${id}/decision`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status, admin_note: admin_note || null }),
	}),
	cancel: (id: number) => leaveRequest<LeaveRecord>(`/${id}/cancel`, { method: 'POST' }),
}

export type PaymentRecord = {
	id: number
	student_id: number
	amount: number
	payment_date: string | null
	method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | null
	reference: string | null
	remarks: string | null
	status: 'PENDING' | 'PAID' | 'OVERDUE' | 'FAILED'
	due_date: string | null
	created_at: string
	updated_at: string
	recorded_by?: number | null
}

export type DemoPaymentRecord = {
	id: number
	student_id: number
	order_id: string
	transaction_id: string
	academic_year: string
	study_year: string
	semester: string
	payment_for: string
	email: string
	contact_number: string
	amount: number
	method: string
	status: 'DEMO_UNVERIFIED'
	created_at: string
}

export type PaymentSummary = {
	total_fee: number | null
	verified_paid: number
	outstanding: number | null
	due_date: string | null
	payment_status: 'NOT_CONFIGURED' | 'PAID' | 'DUE'
	payments: PaymentRecord[]
	demo_payments: DemoPaymentRecord[]
}

export type FeeConfiguration = { id: number; academic_period: string; total_fee: number; due_date: string | null }

async function paymentRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')
	const response = await fetch(`${API_BASE_URL}/api/payments${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } })
	if (!response.ok) throw new Error(await getErrorMessage(response))
	return response.json() as Promise<T>
}

export const paymentService = {
	mySummary: () => paymentRequest<PaymentSummary>('/my/summary'),
	my: () => paymentRequest<PaymentRecord[]>('/my'),
	all: (status?: PaymentRecord['status'], studentId?: number) => {
		const params = new URLSearchParams()
		if (status) params.set('status', status)
		if (studentId) params.set('student_id', String(studentId))
		const query = params.toString()
		return paymentRequest<PaymentRecord[]>(query ? `?${query}` : '')
	},
	record: (input: { student_id: number; amount: number; payment_date: string; method: PaymentRecord['method']; reference?: string; remarks?: string }) => paymentRequest<PaymentRecord>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
	createDemo: (input: { academic_year: string; study_year: string; semester: string; payment_for: string; email: string; contact_number: string; amount: number; method: string; order_id: string }) => paymentRequest<DemoPaymentRecord>('/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
	config: () => paymentRequest<FeeConfiguration | null>('/config'),
	saveConfig: (input: { academic_period: string; total_fee: number; due_date?: string }) => paymentRequest<FeeConfiguration>('/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
}

export const attendanceService = {
	getOverview: () => attendanceRequest<AttendanceSummary>('/my/summary'),
	getRecords: (month?: string) => {
		const query = month ? `?month=${encodeURIComponent(month)}` : ''
		return attendanceRequest<AttendanceRecord[]>(`/my${query}`)
	},
}

export const attendanceManagementService = {
	list: (filters: { studentId?: number; date?: string; status?: AttendanceStatus } = {}) => {
		const params = new URLSearchParams()
		if (filters.studentId) params.set('student_id', String(filters.studentId))
		if (filters.date) params.set('date', filters.date)
		if (filters.status) params.set('status', filters.status)
		const query = params.toString()
		return attendanceRequest<Attendance[]>(query ? `?${query}` : '')
	},
	my: () => attendanceRequest<Attendance[]>('/my'),
	mySummary: () => attendanceRequest<AttendanceSummary>('/my/summary'),
	create: (input: { student_id: number; attendance_date: string; status: AttendanceStatus }) => attendanceRequest<Attendance>('', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	update: (id: number, input: { attendance_date?: string; status?: AttendanceStatus }) => attendanceRequest<Attendance>(`/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	bulkUpdate: (input: { attendance_date: string; records: { student_id: number; status: AttendanceStatus }[] }) => attendanceRequest<{ attendance_date: string; total_students: number; present: number; absent: number }>('/bulk', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
}

export type AnnouncementCategory = 'GENERAL' | 'ACADEMIC' | 'HOSTEL' | 'MAINTENANCE' | 'MESS' | 'SECURITY' | 'EVENT' | 'EMERGENCY'
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type AnnouncementTarget = 'ALL_STUDENTS' | 'BLOCK' | 'ROOM'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AnnouncementRecord = {
	id: number
	title: string
	message: string
	category: AnnouncementCategory
	priority: AnnouncementPriority
	target: AnnouncementTarget
	target_block: string | null
	target_room: string | null
	status: AnnouncementStatus
	publish_at: string | null
	expires_at: string | null
	created_by: number
	created_at: string
	updated_at: string
}

async function announcementRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')
	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/announcements${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}
	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		if (response.status === 403) throw new Error('You do not have permission to perform this action.')
		throw new Error(await getErrorMessage(response))
	}
	return response.json() as Promise<T>
}

export const announcementService = {
	list: () => announcementRequest<AnnouncementRecord[]>(''),
	my: () => announcementRequest<AnnouncementRecord[]>('/my'),
	create: (input: Omit<AnnouncementRecord, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'status'>) => announcementRequest<AnnouncementRecord>('', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	update: (id: number, input: Partial<Omit<AnnouncementRecord, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'status'>>) => announcementRequest<AnnouncementRecord>(`/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	}),
	publish: (id: number) => announcementRequest<AnnouncementRecord>(`/${id}/publish`, { method: 'POST' }),
	archive: (id: number) => announcementRequest<AnnouncementRecord>(`/${id}/archive`, { method: 'POST' }),
}

export type NotificationType = 'LEAVE' | 'VISITOR' | 'COMPLAINT' | 'ANNOUNCEMENT' | 'ROOM' | 'PAYMENT' | 'SYSTEM'
export type NotificationRecord = {
	id: number
	title: string
	message: string
	notification_type: NotificationType
	related_record_id: number | null
	is_read: boolean
	created_at: string
}

async function notificationRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')
	const response = await fetch(`${API_BASE_URL}/api/notifications${path}`, {
		...options,
		headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
	})
	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		throw new Error(await getErrorMessage(response))
	}
	return response.json() as Promise<T>
}

export const notificationService = {
	list: () => notificationRequest<NotificationRecord[]>(''),
	unreadCount: () => notificationRequest<{ unread_count: number }>('/unread-count'),
	markRead: (id: number) => notificationRequest<NotificationRecord>(`/${id}/read`, { method: 'POST' }),
	markAllRead: () => notificationRequest<{ updated: number }>('/read-all', { method: 'POST' }),
}

export function notificationWebSocketUrl(): string {
	const websocketBase = API_BASE_URL.replace(/^http/, 'ws')
	return `${websocketBase}/api/notifications/ws`
}

export function notificationWebSocketProtocols(): string[] {
	const token = getAuthToken()
	return token ? ['smartstay', `smartstay-token.${token}`] : ['smartstay']
}
export const adminService = { getStudents: async () => Promise.resolve(students) }


export type MessMeal = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'
export type MessFeedback = {
	id: number
	student_id: number
	meal: MessMeal
	rating: number
	comment: string | null
	feedback_date: string
	reviewed: boolean
	created_at: string
	updated_at: string
}

async function messFeedbackRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken()
	if (!token) throw new Error('Your session has expired. Please sign in again.')

	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/mess-feedback${path}`, {
			...options,
			headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) {
		if (response.status === 401) sessionStorage.removeItem(AUTH_TOKEN_KEY)
		if (response.status === 403) throw new Error('You do not have permission to perform this action.')
		throw new Error(await getErrorMessage(response))
	}
	if (response.status === 204) return undefined as T
	return response.json() as Promise<T>
}

export const messFeedbackService = {
	getMy: () => messFeedbackRequest<MessFeedback[]>('/my'),
	getAll: () => messFeedbackRequest<MessFeedback[]>(''),
	create: (input: { meal: MessMeal; rating: number; comment?: string }) =>
		messFeedbackRequest<MessFeedback>('', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		}),
	update: (id: number, reviewed: boolean) =>
		messFeedbackRequest<MessFeedback>(`/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reviewed }),
		}),
	remove: (id: number) => messFeedbackRequest<void>(`/${id}`, { method: 'DELETE' }),
}

export type MessMenuRecord = {
	id: number
	menu_date: string
	meal_type: MessMeal
	items: string
	special_note: string | null
	status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
	created_by: number
	created_at: string
	updated_at: string
}

export const messMenuService = {
	list: () => messRequest<MessMenuRecord[]>(''),
}
