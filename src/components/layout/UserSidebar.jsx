import Sidebar from './Sidebar.jsx'
import { USER_NAV_ITEMS } from '../../lib/userNav.js'

/**
 * Left navigation used across every screen inside the user panel.
 * Thin wrapper around the generic `Sidebar` shell with the user nav
 * links and home route.
 */
function UserSidebar(props) {
  return <Sidebar navItems={USER_NAV_ITEMS} homeTo="/user/dashboard" {...props} />
}

export default UserSidebar
