import { useState } from 'react'

const GOOGLE_COLORS = [
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-purple-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-600 text-white',
  'bg-teal-600 text-white',
  'bg-indigo-600 text-white',
  'bg-cyan-600 text-white',
  'bg-orange-600 text-white',
]

function getAvatarColor(name = '') {
  if (!name) return GOOGLE_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GOOGLE_COLORS[Math.abs(hash) % GOOGLE_COLORS.length]
}

/**
 * Google-style profile avatar:
 * - If image src is provided and loads successfully: renders rounded profile image.
 * - If no image or image fails to load: renders clean circular initial with Google Material color.
 */
export default function UserAvatar({
  name = '',
  src = '',
  email = '',
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  className = '',
  showTooltip = false,
}) {
  const [imgError, setImgError] = useState(false)

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm font-bold',
    lg: 'h-12 w-12 text-base font-bold',
    xl: 'h-16 w-16 text-xl font-bold',
  }[size] || 'h-10 w-10 text-sm font-bold'

  const displayName = name || email || 'User'
  const initial = (displayName.trim()[0] || 'U').toUpperCase()
  const colorClass = getAvatarColor(displayName)

  const hasValidImage = Boolean(src && !imgError)

  return (
    <div
      title={showTooltip ? displayName : undefined}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden select-none shadow-2xs border border-white/20 ${sizeClasses} ${className}`}
    >
      {hasValidImage ? (
        <img
          src={src}
          alt={displayName}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover rounded-full"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center font-bold tracking-tight rounded-full ${colorClass}`}>
          {initial}
        </div>
      )}
    </div>
  )
}
