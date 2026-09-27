export type Role = 'student' | 'admin'

export const student = {
  name: 'Aarav Mehta',
  id: 'STU-2024-1842',
  room: 'Block B - 204',
  email: 'aarav.mehta@campus.edu',
  course: 'B.Tech Computer Science',
  year: '3rd Year',
}

export const stats = {
  student: [
    { label: 'Attendance', value: '91%', note: '+3.2% this month', tone: 'mint' },
    { label: 'Open complaints', value: '01', note: '1 in progress', tone: 'amber' },
    { label: 'Leave requests', value: '01', note: 'Awaiting review', tone: 'blue' },
    { label: 'Room status', value: 'Good', note: 'Last checked 2 days ago', tone: 'coral' },
  ],
  admin: [
    { label: 'Total students', value: '1,248', note: '+48 this semester', tone: 'blue' },
    { label: 'Occupied rooms', value: '386', note: '82% occupancy', tone: 'mint' },
    { label: 'Pending complaints', value: '24', note: '6 high priority', tone: 'amber' },
    { label: 'Leave requests', value: '18', note: 'Needs attention', tone: 'coral' },
  ],
}

export const announcements = [
  { title: 'Annual hostel maintenance window', body: 'Block B electrical inspection is scheduled for Saturday, 10:00 AM to 2:00 PM.', tag: 'Maintenance', date: 'Today' },
  { title: 'Inter-hostel sports registrations', body: 'Sign up for badminton, football and athletics before Friday evening.', tag: 'Activities', date: '2 days ago' },
  { title: 'Mess feedback week is live', body: 'Share your feedback on this week\'s menu to help the mess team improve.', tag: 'Mess', date: 'Sep 08' },
]

export const complaints = [
  { id: 'CMP-1048', subject: 'AC in room is not working', category: 'Maintenance', priority: 'High', status: 'In Progress', date: 'Sep 12', student: 'Aarav Mehta', assigned: 'Facilities team' },
  { id: 'CMP-1032', subject: 'Internet connectivity on 2nd floor', category: 'Internet', priority: 'Medium', status: 'Open', date: 'Sep 09', student: 'Nisha Rao', assigned: 'IT support' },
  { id: 'CMP-0991', subject: 'Leaking tap near washroom', category: 'Plumbing', priority: 'Low', status: 'Resolved', date: 'Sep 04', student: 'Kabir Singh', assigned: 'Maintenance' },
  { id: 'CMP-0984', subject: 'Mess dinner timing', category: 'Mess', priority: 'Medium', status: 'Resolved', date: 'Sep 02', student: 'Diya Shah', assigned: 'Mess manager' },
]

export const students = [
  { id: 'STU-2024-1842', name: 'Aarav Mehta', email: 'aarav.mehta@campus.edu', course: 'Computer Science', year: '3rd', room: 'B-204', status: 'Active' },
  { id: 'STU-2024-1729', name: 'Nisha Rao', email: 'nisha.rao@campus.edu', course: 'Electrical Engineering', year: '2nd', room: 'A-116', status: 'Active' },
  { id: 'STU-2023-0911', name: 'Kabir Singh', email: 'kabir.singh@campus.edu', course: 'Mechanical Engineering', year: '4th', room: 'C-312', status: 'Active' },
  { id: 'STU-2024-2014', name: 'Diya Shah', email: 'diya.shah@campus.edu', course: 'Architecture', year: '2nd', room: 'B-118', status: 'On leave' },
  { id: 'STU-2025-0220', name: 'Ishaan Verma', email: 'ishaan.verma@campus.edu', course: 'Business Administration', year: '1st', room: 'A-208', status: 'Active' },
]

export const menu = [
  { day: 'Monday', meals: ['Poha & boiled egg', 'Rajma, rice, roti', 'Masala chai', 'Paneer tikka & dal'] },
  { day: 'Tuesday', meals: ['Stuffed paratha', 'Veg biryani, raita', 'Fruit & tea', 'Chicken curry / soy chaap'] },
  { day: 'Wednesday', meals: ['Idli, sambar, chutney', 'Dal makhani, jeera rice', 'Sprouts chaat', 'Aloo gobi & roti'] },
  { day: 'Thursday', meals: ['Upma & banana', 'Chole, rice, salad', 'Lemon tea', 'Egg curry & roti'] },
  { day: 'Friday', meals: ['Aloo puri', 'Veg noodles, manchurian', 'Lassi', 'Fish curry / tofu masala'] },
]

export const leaveRequests = [
  { id: 'LR-089', type: 'Personal leave', from: 'Sep 18', to: 'Sep 20', reason: 'Family function', status: 'Pending' },
  { id: 'LR-071', type: 'Weekend leave', from: 'Aug 30', to: 'Sep 01', reason: 'Home visit', status: 'Approved' },
  { id: 'LR-058', type: 'Medical leave', from: 'Aug 16', to: 'Aug 17', reason: 'Routine appointment', status: 'Rejected' },
]

export const visitors = [
  { name: 'Rohan Mehta', relation: 'Brother', date: 'Sep 14', time: '4:30 PM', status: 'Expected' },
  { name: 'Priya Nair', relation: 'Friend', date: 'Sep 07', time: '2:00 PM', status: 'Checked out' },
]

export const rooms = [
  { room: 'B-204', block: 'Block B', type: 'Twin sharing', occupants: 'Aarav Mehta, Ishaan Verma', status: 'Occupied' },
  { room: 'B-205', block: 'Block B', type: 'Twin sharing', occupants: 'Unallocated', status: 'Available' },
  { room: 'A-116', block: 'Block A', type: 'Triple sharing', occupants: 'Nisha Rao + 1', status: 'Occupied' },
  { room: 'C-312', block: 'Block C', type: 'Single', occupants: 'Kabir Singh', status: 'Occupied' },
  { room: 'C-118', block: 'Block C', type: 'Twin sharing', occupants: 'Closed for repairs', status: 'Maintenance' },
]

export const maintenance = [
  { asset: 'AC-101', location: 'Block B / 2nd floor', last: 'Aug 18, 2026', complaints: 8, status: 'Inspection due', risk: 82 },
  { asset: 'GEN-02', location: 'Utility building', last: 'Sep 01, 2026', complaints: 1, status: 'Healthy', risk: 18 },
  { asset: 'WM-06', location: 'Block A / Laundry', last: 'Jul 26, 2026', complaints: 4, status: 'Watchlist', risk: 57 },
]
