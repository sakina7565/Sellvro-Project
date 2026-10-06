import logoSrc from '../../assets/logo.png'

/**
 * Sellvro logo (mark + wordmark), used across the public site, auth screens,
 * top navigation bar and panel sidebars.
 */
function Logo({ size = 'md', className = '', alt = 'Sellvro' }) {
  const heights = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  }
  const height = typeof size === 'number' ? size : heights[size] || heights.md

  return (
    <img
      src={logoSrc}
      alt={alt}
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={`inline-block select-none object-contain ${className}`}
      loading="eager"
    />
  )
}

export default Logo

