/**
 * Generic rounded white surface used for the auth cards, dashboard
 * stat cards and panels.
 */
function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-xl2 bg-surface-card shadow-card ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card
