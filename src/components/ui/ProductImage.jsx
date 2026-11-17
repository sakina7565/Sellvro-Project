import { useState } from 'react'
import { Package } from 'lucide-react'
import { mediaUrl } from '../../lib/api.js'

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'

/**
 * Robust Product Image component that:
 * 1. Formats relative API URLs using mediaUrl.
 * 2. Displays genuine uploaded image.
 * 3. Gracefully falls back to a clean placeholder on error or empty URL.
 */
export default function ProductImage({
  src = '',
  alt = 'Product',
  size = 'md',
  className = '',
  aspectSquare = true,
  fallback = DEFAULT_FALLBACK,
}) {
  const [hasError, setHasError] = useState(false)

  const sizeClasses = {
    xs: 'h-7 w-7 rounded-md',
    sm: 'h-10 w-10 rounded-lg',
    md: 'h-12 w-12 rounded-xl',
    lg: 'h-16 w-16 rounded-xl',
    xl: 'h-24 w-24 rounded-2xl',
    full: 'h-full w-full',
  }[size] || 'h-12 w-12 rounded-xl'

  const formattedUrl = src ? mediaUrl(src) : ''
  const showFallback = !formattedUrl || hasError

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-slate-200/80 bg-slate-50 ${
        aspectSquare ? 'aspect-square' : ''
      } ${sizeClasses} ${className}`}
    >
      {!showFallback ? (
        <img
          src={formattedUrl}
          alt={alt}
          loading="lazy"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-transform duration-200"
        />
      ) : fallback ? (
        <img
          src={fallback}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover opacity-85"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
          <Package className="h-1/2 w-1/2 stroke-1 text-slate-400" />
        </div>
      )}
    </div>
  )
}
