'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'outbid': return '⚠️'
    case 'won': return '🎉'
    case 'ending_soon': return '⏰'
    case 'auction_start': return '🔔'
    case 'payment_due': return '💳'
    case 'shipped': return '📦'
    default: return '📌'
  }
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Subscribe to real-time notifications
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev].slice(0, 20))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    // Poll every 60s as backup
    const interval = setInterval(fetchNotifications, 60000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  const markOneRead = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-obsidian-400 hover:text-obsidian-200 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-obsidian-900 border border-obsidian-700 rounded-xl shadow-2xl overflow-hidden z-50"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-800">
            <h3 className="text-sm font-semibold text-obsidian-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-dgw-gold hover:text-dgw-gold-light transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-10 h-10 mx-auto text-obsidian-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-obsidian-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const inner = (
                  <div
                    className={`flex gap-3 px-4 py-3 hover:bg-obsidian-800/50 transition-colors border-b border-obsidian-800/50 cursor-pointer ${
                      !notif.read ? 'bg-dgw-gold/[0.03]' : ''
                    }`}
                    onClick={() => {
                      if (!notif.read) markOneRead(notif.id)
                      if (notif.link) setIsOpen(false)
                    }}
                  >
                    {/* Icon */}
                    <span className="text-lg shrink-0 mt-0.5">{getNotificationIcon(notif.type)}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.read ? 'text-obsidian-100 font-medium' : 'text-obsidian-300'}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-obsidian-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      <p className="text-[10px] text-obsidian-600 mt-1">{formatTimeAgo(notif.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-dgw-gold shrink-0 mt-2" />
                    )}
                  </div>
                )

                return notif.link ? (
                  <Link key={notif.id} href={notif.link}>{inner}</Link>
                ) : (
                  <div key={notif.id}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
