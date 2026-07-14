import Sidebar from './Sidebar.jsx'
import { SUPPLIER_NAV_ITEMS } from '../../lib/supplierNav.js'

/**
 * Left navigation used across every screen inside the supplier panel.
 * Thin wrapper around the generic `Sidebar` shell with the supplier
 * nav links and home route.
 */
function SupplierSidebar(props) {
  return <Sidebar navItems={SUPPLIER_NAV_ITEMS} homeTo="/supplier/dashboard" {...props} />
}

export default SupplierSidebar
