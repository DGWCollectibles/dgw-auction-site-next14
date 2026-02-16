'use client'

import { useState, useEffect, useRef } from 'react'

interface Conversation {
  id: string
  subject: string
  status: string
  sender_name: string
  sender_email: string
  user_id: string | null
  unread_by_admin: boolean
  last_message_at: string
  last_message: { body: string; sender_type: string; created_at: string } | null
  message_count: number
  created_at: string
}

interface Message {
  id: string
  conversation_id: string
  sender_type: string
  sender_id: string | null
  body: string
  created_at: string
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('open')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    const res = await fetch(`/api/admin/messages?status=${filter}`)
    const data = await res.json()
    setConversations(data.conversations || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchConversations()
  }, [filter])

  const selectConversation = async (id: string) => {
    setSelectedId(id)
    setMsgLoading(true)
    setReply('')

    const res = await fetch(`/api/admin/messages?id=${id}`)
    const data = await res.json()
    setSelectedConv(data.conversation)
    setMessages(data.messages || [])
    setMsgLoading(false)

    // Mark as read in local state
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unread_by_admin: false } : c
    ))

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return
    setSending(true)

    try {
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedId, message: reply }),
      })

      if (res.ok) {
        setReply('')
        await selectConversation(selectedId)
        fetchConversations()
      }
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: id, status }),
    })
    fetchConversations()
    if (selectedId === id) {
      setSelectedConv((prev: any) => prev ? { ...prev, status } : prev)
    }
  }

  const unreadCount = conversations.filter(c => c.unread_by_admin).length

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Left: Conversation List */}
      <div className="w-96 border-r border-obsidian-800 flex flex-col bg-obsidian-950">
        {/* Header */}
        <div className="p-4 border-b border-obsidian-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-obsidian-100">Messages</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-dgw-gold/20 text-dgw-gold text-xs font-bold rounded-full">{unreadCount}</span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {['open', 'closed', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                  filter === f ? 'bg-dgw-gold/20 text-dgw-gold' : 'text-obsidian-400 hover:text-obsidian-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-obsidian-500 text-sm">No {filter} conversations</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left p-4 border-b border-obsidian-800/50 transition-colors ${
                  selectedId === conv.id ? 'bg-dgw-gold/5 border-l-2 border-l-dgw-gold' :
                  conv.unread_by_admin ? 'bg-obsidian-900/50 hover:bg-obsidian-800/30' :
                  'hover:bg-obsidian-900/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {conv.unread_by_admin && (
                      <span className="w-2 h-2 rounded-full bg-dgw-gold shrink-0" />
                    )}
                    <span className={`text-sm truncate ${conv.unread_by_admin ? 'text-obsidian-100 font-semibold' : 'text-obsidian-300'}`}>
                      {conv.sender_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-obsidian-600 shrink-0">{timeAgo(conv.last_message_at)}</span>
                </div>
                <p className={`text-xs truncate mb-1 ${conv.unread_by_admin ? 'text-obsidian-200' : 'text-obsidian-400'}`}>
                  {conv.subject}
                </p>
                {conv.last_message && (
                  <p className="text-[11px] text-obsidian-600 truncate">
                    {conv.last_message.sender_type === 'admin' ? 'You: ' : ''}
                    {conv.last_message.body}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-obsidian-600">{conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}</span>
                  {conv.status === 'closed' && (
                    <span className="text-[10px] text-obsidian-600 bg-obsidian-800 px-1.5 py-0.5 rounded">Closed</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Thread View */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a]">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-obsidian-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-obsidian-500 text-sm">Select a conversation</p>
            </div>
          </div>
        ) : msgLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-obsidian-800 flex items-center justify-between">
              <div>
                <h2 className="text-obsidian-100 font-medium">{selectedConv?.subject}</h2>
                <p className="text-xs text-obsidian-500">
                  {selectedConv?.user?.full_name || selectedConv?.guest_name || 'Guest'}
                  {' '}
                  <span className="text-obsidian-600">
                    ({selectedConv?.user?.email || selectedConv?.guest_email})
                  </span>
                  {selectedConv?.user_id && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded">Registered</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedConv?.status === 'open' ? (
                  <button
                    onClick={() => updateStatus(selectedId!, 'closed')}
                    className="px-3 py-1.5 text-xs border border-obsidian-700 text-obsidian-400 hover:text-obsidian-200 hover:border-obsidian-600 rounded transition-colors"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(selectedId!, 'open')}
                    className="px-3 py-1.5 text-xs border border-green-500/30 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                  >
                    Reopen
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selectedId!, 'archived')}
                  className="px-3 py-1.5 text-xs border border-obsidian-700 text-obsidian-500 hover:text-obsidian-300 rounded transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isAdmin = msg.sender_type === 'admin'
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      isAdmin
                        ? 'bg-dgw-gold/10 border border-dgw-gold/20'
                        : 'bg-obsidian-900 border border-obsidian-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium uppercase tracking-wider ${
                          isAdmin ? 'text-dgw-gold' : 'text-obsidian-400'
                        }`}>
                          {isAdmin ? 'DGW' : msg.sender_type === 'guest' ? 'Guest' : 'Customer'}
                        </span>
                        <span className="text-[10px] text-obsidian-600">
                          {new Date(msg.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-obsidian-200 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            {selectedConv?.status !== 'archived' && (
              <div className="p-4 border-t border-obsidian-800">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendReply()
                      }
                    }}
                    rows={2}
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    className="flex-1 px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 resize-none transition-colors"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="px-5 self-end py-3 bg-gradient-to-r from-dgw-gold-dark via-dgw-gold to-dgw-gold-light text-[#0a0a0a] font-bold text-sm rounded-lg hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50 transition-all"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
