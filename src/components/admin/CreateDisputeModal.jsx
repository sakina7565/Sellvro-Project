import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { disputeApi, getErrorMessage } from '../../lib/api.js'

const DISPUTE_TYPES = [
  'Damaged Product',
  'Wrong Specification',
  'Quality Issue',
  'Missing Units',
  'Supplier Fulfillment Issue',
  'Pricing / Commission Dispute',
  'Other',
]

function CreateDisputeModal({ isOpen, onClose, product, onSuccess }) {
  const fileInputRef = useRef(null)
  const [disputeType, setDisputeType] = useState('')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !product) return null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    setAttachment(file || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!disputeType) {
      setError('Please select a dispute type.')
      return
    }
    if (!message.trim()) {
      setError('Please describe the issue in detail.')
      return
    }

    setLoading(true)
    try {
      const fullMessage = `[${disputeType}] Product: ${product.name} (SKU: ${product.sku})\n\n${message.trim()}`

      const payload = {
        message: fullMessage,
        type: 'supplier_dispute',
        againstRole: 'supplier',
        productId: product.id,
      }

      await disputeApi.create(payload)
      onSuccess?.('Dispute / Complaint created successfully.')
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit dispute.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Create Dispute / Complaint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Dispute Type */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Dispute Type
            </label>
            <select
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              required
            >
              <option value="">Select Type</option>
              {DISPUTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 resize-y"
              required
            />
          </div>

          {/* Attachment (Proof) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Attachment (Proof)
            </label>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1.5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
              >
                Choose File
              </button>
              <span className="ml-3 truncate text-xs text-slate-500">
                {attachment ? attachment.name : 'No file chosen'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateDisputeModal
