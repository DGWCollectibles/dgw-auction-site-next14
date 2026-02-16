'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  subject: string
  status: string
  unread_by_user: boolean
  last_message_at: string
  last_message: { body: string; sender_type: string; created_at: string } | null
  message_count: number
  created_at: string
}

interface Message {
  id: string
  sender_type: string
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

export default function UserMessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirect=/account/messages')
        return
      }
      setUser(user)
      await fetchConversations()
      setLoading(false)
    }
    init()
  }, [])

  const fetchConversations = async () => {
    const res = await fetch('/api/messages')
    if (res.ok) {
      const data = await res.json()
      setConversations(data.conversations || [])
    }
  }

  const selectConversation = async (id: string) => {
    setSelectedId(id)
    setMsgLoading(true)
    setReply('')

    const supabase = createClient()

    // Fetch messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_type, body, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    // Mark as read by user
    await supabase
      .from('conversations')
      .update({ unread_by_user: false })
      .eq('id', id)

    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unread_by_user: false } : c
    ))

    setMsgLoading(false)
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

  const selectedConv = conversations.find(c => c.id === selectedId)

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-obsidian-500 mb-2">
              <Link href="/account" className="hover:text-dgw-gold transition-colors">Account</Link>
              <span>/</span>
              <span className="text-obsidian-300">Messages</span>
            </div>
            <h1 className="text-2xl heading-display text-obsidian-100">Messages</h1>
          </div>
          <Link
            href="/contact"
            className="btn btn-primary text-sm"
          >
            New Message
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-obsidian-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-obsidian-400 mb-2">No messages yet</p>
            <p className="text-obsidian-500 text-sm mb-4">Have a question? We&apos;re here to help.</p>
            <Link href="/contact" className="text-dgw-gold text-sm hover:underline">Send us a message</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Conversation List */}
            <div className="md:col-span-1 space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedId === conv.id
                      ? 'border-dgw-gold/30 bg-dgw-gold/5'
                      : conv.unread_by_user
                      ? 'border-dgw-gold/15 bg-obsidian-900/80 hover:bg-obsidian-800/50'
                      : 'border-obsidian-800 hover:border-obsidian-700 bg-obsidian-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.unread_by_user && (
                        <span className="w-2 h-2 rounded-full bg-dgw-gold shrink-0" />
                      )}
                      <span className={`text-sm truncate ${conv.unread_by_user ? 'text-obsidian-100 font-semibold' : 'text-obsidian-300'}`}>
                        {conv.subject}
                      </span>
                    </div>
                    <span className="text-[10px] text-obsidian-600 shrink-0">{timeAgo(conv.last_message_at)}</span>
                  </div>
                  {conv.last_message && (
                    <p className="text-[11px] text-obsidian-600 truncate">
                      {conv.last_message.sender_type === 'user' ? 'You: ' :
                       conv.last_message.sender_type === 'admin' ? 'DGW: ' : ''}
                      {conv.last_message.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      conv.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-obsidian-800 text-obsidian-500'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Thread View */}
            <div className="md:col-span-2">
              {!selectedId ? (
                <div className="flex items-center justify-center py-20 border border-obsidian-800 rounded-lg bg-obsidian-900/20">
                  <p className="text-obsidian-500 text-sm">Select a conversation to view</p>
                </div>
              ) : msgLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
                </div>
              ) : (
                <div className="border border-obsidian-800 rounded-lg overflow-hidden">
                  {/* Thread header */}
                  <div className="px-5 py-3 border-b border-obsidian-800 bg-obsidian-900/30">
                    <h3 className="text-obsidian-200 font-medium text-sm">{selectedConv?.subject}</h3>
                    <p className="text-[11px] text-obsidian-600">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Messages */}
                  <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => {
                      const isUser = msg.sender_type === 'user' || msg.sender_type === 'guest'
                      return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            isUser
                              ? 'bg-dgw-gold/10 border border-dgw-gold/20'
                              : 'bg-obsidian-800/50 border border-obsidian-800'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                                isUser ? 'text-dgw-gold' : 'text-green-400'
                              }`}>
                                {isUser ? 'You' : 'DGW'}
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

                  {/* Reply */}
                  {selectedConv?.status !== 'closed' && (
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
                          placeholder="Type your reply..."
                          className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-obsidian-700 rounded-lg text-sm text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 resize-none"
                        />
                        <button
                          onClick={sendReply}
                          disabled={!reply.trim() || sending}
                          className="px-5 self-end py-3 rounded-lg font-bold text-sm text-[#0a0a0a] disabled:opacity-50 transition-all"
                          style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
                        >
                          {sending ? '...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
