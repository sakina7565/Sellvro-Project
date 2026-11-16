import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Send,
  ShieldAlert,
  Store,
  X,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

export default function SendMessageModal({ supplier, open, onClose, onSuccess }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isWarning, setIsWarning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !supplier) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedMsg = message.trim()
    if (!trimmedMsg) {
      setError('Please enter a message for the supplier.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        subject: subject.trim() || (isWarning ? 'Performance Warning Notice' : 'Notice from Administration'),
        message: trimmedMsg,
        isWarning,
      }

      const res = await adminApi.sendMessageToSupplier(supplier.id, payload)
      if (onSuccess) {
        onSuccess(res)
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message to supplier.'))
    } finally {
      setSubmitting(false)
    }
  }

  const supplierDisplayId = supplier.supplierDisplayId || supplier.id?.slice(-6).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Send Message / Notice to Supplier
              </h3>
              <p className="text-[11px] text-slate-500">
                Direct communication through the Disputes &amp; Notices center
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Supplier Snippet */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <strong className="text-slate-900 block font-semibold">{supplier.fullName}</strong>
                <span className="text-[11px] text-slate-400">{supplier.email}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {supplierDisplayId}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 capitalize">
                Status: {supplier.status}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Subject / Topic
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Order Handling SLA Delay, Product Packaging Standard, Inquiry..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message, instruction, or warning details here for the supplier..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Warning Toggle Option */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isWarning}
                onChange={(e) => setIsWarning(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Mark as Official Performance Warning
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  Is option ko check karne se ye warning supplier ke account warnings counter mein add ho jayegi (Maximum 3 warnings policy).
                </p>
              </div>
            </label>
          </div>

          {/* Explanatory Notice */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-[11px] text-indigo-900 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Ye message submit hone par Supplier Panel ke <strong>Disputes</strong> tab mein receive hoga. Supplier wahan is message ko dekh sakega aur reply/clarification de sakega.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {submitting ? 'Sending Message...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
