import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { adminApi, getErrorMessage } from '../../lib/api.js'

function DeleteAccountModal({ isOpen, onClose, onSuccess, account }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !account) return null

  const handleDelete = async () => {
    setError('')
    setLoading(true)
    try {
      await adminApi.deleteAccount(account.id)
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-900">Delete Account?</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <strong className="text-slate-800">{account.fullName}</strong> ({account.email})?
          This action will remove all profile details and credentials immediately and cannot be undone.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            tone="danger"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {loading ? 'Deleting…' : 'Delete Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccountModal
