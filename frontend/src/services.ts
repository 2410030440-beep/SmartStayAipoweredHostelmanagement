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
	let response: Response
	try {
		response = await fetch(`${API_BASE_URL}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
		})
	} catch {
		throw new Error('Unable to reach SmartStay. Check that the backend is running and try again.')
	}

	if (!response.ok) throw new Error(await getErrorMessage(response))

	const loginResponse = await response.json() as LoginResponse
	sessionStorage.setItem(AUTH_TOKEN_KEY, loginResponse.access_token)
	return getCurrentUser()
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
}

export const attendanceService = {
	getOverview: () => attendanceRequest<AttendanceSummary>('/my/summary'),
	getRecords: (month?: string) => {
		const query = month ? `?month=${encodeURIComponent(month)}` : ''
		return attendanceRequest<AttendanceRecord[]>(`/my${query}`)
	},
}

export const notificationService = { getUnreadCount: async () => Promise.resolve(3) }
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
