import Sidebar from './Sidebar.jsx'
import { ADMIN_NAV_ITEMS } from '../../lib/adminNav.js'

/**
 * Left navigation used across every screen inside the admin panel.
 * Thin wrapper around the generic `Sidebar` shell with the admin
 * nav links and home route.
 */
function AdminSidebar(props) {
  return <Sidebar navItems={ADMIN_NAV_ITEMS} homeTo="/admin/dashboard" {...props} />
}

export default AdminSidebar
