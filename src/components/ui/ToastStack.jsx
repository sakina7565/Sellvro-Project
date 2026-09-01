import { X } from 'lucide-react'

export default function ToastStack({ toasts = [], onDismiss = () => {} }) {
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-primary-100 bg-white px-4 py-3 shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{toast.message}</p>
            {toast.detail ? <p className="mt-0.5 text-xs text-slate-500">{toast.detail}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
