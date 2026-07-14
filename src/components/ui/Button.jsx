const VARIANT_CLASSES = {
  primary:
    'bg-primary text-white hover:bg-primary-700 shadow-soft focus-visible:ring-primary-300',
  outline:
    'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-200',
  ghost:
    'bg-transparent text-slate-600 hover:text-slate-900 focus-visible:ring-slate-200',
  link: 'bg-transparent text-primary hover:text-primary-700 p-0 h-auto font-semibold',
}

const SIZE_CLASSES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

/**
 * Shared button used for CTAs across landing, auth and admin pages.
 */
function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <Component
      className={`${base} ${VARIANT_CLASSES[variant]} ${variant === 'link' ? '' : SIZE_CLASSES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Button
