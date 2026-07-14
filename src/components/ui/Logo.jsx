import logoSrc from '../../assets/logo.png'

/**
 * "Urbanoas" wordmark, used across the public site, auth screens and
 * the admin sidebar. Renders the official logo asset; `size` scales
 * it proportionally (the source image's aspect ratio is preserved).
 */
function Logo({ size = 'md', className = '' }) {
  const heights = {
    sm: 22,
    md: 29,
    lg: 36,
  }
  const height = heights[size] || heights.md

  return <img src={logoSrc} alt="Urbanoas" height={height} style={{ height }} className={`w-auto ${className}`} />
}

export default Logo
