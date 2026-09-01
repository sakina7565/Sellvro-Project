import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, MessageCircle, Send } from 'lucide-react'
import Badge from '../ui/Badge.jsx'

function formatCountdown(ms) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin Staff'
  if (role === 'supplier') return 'Supplier'
  if (role === 'user') return 'User'
  return role || 'Staff'
}

export default function DisputeChatPanel({
  dispute,
  currentUserId = '',
  onSend,
  sending = false,
  error = '',
  canReply = false,
}) {
  const [text, setText] = useState('')
  const [now, setNow] = useState(Date.now())
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const expiresAt = dispute?.chatExpiresAt ? new Date(dispute.chatExpiresAt).getTime() : 0
  const remainingMs = expiresAt - now
  const chatActive = Boolean(dispute?.chatActive && remainingMs > 0)
  const replyEnabled = canReply || chatActive
  const messages = dispute?.messages || []

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [messages],
  )

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [sortedMessages.length, sortedMessages[sortedMessages.length - 1]?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !replyEnabled || sending) return
    await onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-slate-100 bg-slate-50/60">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary-600" />
          <p className="text-sm font-semibold text-slate-800">24-Hour Staff Chat</p>
        </div>
        <Badge tone={replyEnabled ? 'success' : 'neutral'}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {canReply
              ? 'Admin reply enabled'
              : chatActive
                ? `Expires in ${formatCountdown(remainingMs)}`
                : 'Chat closed'}
          </span>
        </Badge>
      </div>

      <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
        {replyEnabled
          ? canReply
            ? 'Admin staff can reply while this dispute is open, even after the 24-hour party chat window.'
            : 'Staff and parties can communicate here. Only messages from the last 24 hours are shown.'
          : dispute?.status === 'resolved'
            ? 'This dispute is resolved. Chat is no longer available.'
            : dispute?.status === 'rejected'
              ? 'This dispute was rejected. Chat is no longer available.'
              : 'The 24-hour chat window has expired. The dispute record remains open for review.'}
      </p>

      <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {sortedMessages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No messages in the last 24 hours.</p>
        ) : (
          sortedMessages.map((item) => {
            const isMine = item.senderId && item.senderId === currentUserId
            return (
              <div key={item.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isMine
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${isMine ? 'text-primary-100' : 'text-slate-400'}`}>
                    {item.senderName || roleLabel(item.role)} · {roleLabel(item.role)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{item.text}</p>
                  <p className={`mt-1 text-[10px] ${isMine ? 'text-primary-100' : 'text-slate-400'}`}>
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={replyEnabled ? 'Type a message for staff…' : 'Chat window closed'}
            disabled={!replyEnabled || sending}
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!replyEnabled || sending || !text.trim()}
            className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  )
}