import Sidebar from './Sidebar.jsx'

/**
 * Left navigation used across every screen inside the admin panel.
 * Thin wrapper around the generic `Sidebar` shell with the admin
 * nav links and home route.
 */
function AdminSidebar({ navItems = [], ...props }) {
  return <Sidebar navItems={navItems} homeTo="/admin/dashboard" {...props} />
}

export default AdminSidebar
