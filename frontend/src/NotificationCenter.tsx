import { useEffect, useState } from 'react'
import { Bell, Check, CircleAlert, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { notificationService, notificationWebSocketProtocols, notificationWebSocketUrl, type AuthRole, type NotificationRecord } from './services'
import './notifications.css'

const pageFor = (type: NotificationRecord['notification_type'], role: AuthRole): string => {
  const prefix = role === 'ADMIN' ? '/admin' : '/student'
  const pages: Record<NotificationRecord['notification_type'], string> = {
    LEAVE: 'leave',
    VISITOR: 'visitors',
    COMPLAINT: 'complaints',
    ANNOUNCEMENT: 'announcements',
    ROOM: 'room',
    PAYMENT: 'payments',
    SYSTEM: 'notifications',
  }
  return `${prefix}/${pages[type]}`
}

const relativeTime = (value: string) => {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return new Date(value).toLocaleDateString()
}

export default function NotificationCenter({ role, fullPage = false }: { role: AuthRole; fullPage?: boolean }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(fullPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let active = true
    let socket: WebSocket | null = null
    let retryTimer: number | undefined
    let retryDelay = 1000

    const load = async () => {
      try {
        const [nextItems, count] = await Promise.all([notificationService.list(), notificationService.unreadCount()])
        if (active) {
          setItems(nextItems)
          setUnread(count.unread_count)
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications.')
      } finally {
        if (active) setLoading(false)
      }
    }

    const connect = () => {
      if (!active) return
      try {
        socket = new WebSocket(notificationWebSocketUrl(), notificationWebSocketProtocols())
        socket.onopen = () => { retryDelay = 1000; setConnected(true) }
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as { event?: string; notification?: NotificationRecord }
            if (payload.event !== 'notification.created' || !payload.notification) return
            const notification = payload.notification
            setItems((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current])
            if (!notification.is_read) setUnread((current) => current + 1)
          } catch {
            setError('A notification update could not be read.')
          }
        }
        socket.onerror = () => setConnected(false)
        socket.onclose = () => {
          setConnected(false)
          if (active) {
            retryTimer = window.setTimeout(connect, retryDelay)
            retryDelay = Math.min(retryDelay * 2, 30000)
          }
        }
      } catch {
        setConnected(false)
        retryTimer = window.setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }

    void load()
    connect()
    return () => {
      active = false
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      socket?.close()
    }
  }, [])

  const markRead = async (notification: NotificationRecord) => {
    if (notification.is_read) return
    try {
      const updated = await notificationService.markRead(notification.id)
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item))
      setUnread((current) => Math.max(0, current - 1))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to mark notification as read.')
    }
  }

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, is_read: true })))
      setUnread(0)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to mark notifications as read.')
    }
  }

  const selectNotification = async (notification: NotificationRecord) => {
    await markRead(notification)
    navigate(pageFor(notification.notification_type, role))
    if (!fullPage) setOpen(false)
  }

  const content = <div className={fullPage ? 'notification-page-panel' : 'notification-dropdown'}>
    <div className="notification-panel-heading"><div><span className="eyebrow">LIVE UPDATES</span><strong>Notifications</strong></div><div className="notification-panel-actions"><span className={`notification-connection ${connected ? 'online' : 'offline'}`}>{connected ? 'Live' : 'Reconnecting'}</span><button type="button" onClick={() => void markAllRead()} disabled={!unread}>Mark all read</button></div></div>
    {error && <div className="notification-error"><CircleAlert size={15} />{error}</div>}
    {loading ? <div className="notification-empty">Loading notifications...</div> : items.length === 0 ? <div className="notification-empty">No notifications yet.</div> : <div className="notification-list">{items.map((notification) => <button className={`notification-item ${notification.is_read ? 'read' : 'unread'}`} type="button" key={notification.id} onClick={() => void selectNotification(notification)}><span className="notification-item-icon"><Bell size={15} /></span><span className="notification-item-copy"><strong>{notification.title}</strong><small>{notification.message}</small><em>{relativeTime(notification.created_at)}</em></span>{!notification.is_read && <i aria-label="Unread" />}</button>)}</div>}
  </div>

  if (fullPage) return <section className="notification-page"><div className="page-header"><div><span className="eyebrow">STAY IN THE KNOW</span><h1>Notifications</h1><p>Updates from your SmartStay workspace.</p></div><Check size={22} /></div>{content}</section>
  return <div className="notification-center"><button className="icon-button header-notification" type="button" onClick={() => setOpen((current) => !current)} aria-label="Open notifications" aria-expanded={open}><Bell size={18} />{unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}</button>{open && <div className="notification-popover">{content}<button className="notification-close" type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={15} /></button></div>}</div>
}
