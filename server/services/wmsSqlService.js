import bcrypt from 'bcryptjs'
import { getMySQLPool, queryWms } from '../config/mysql.js'

/**
 * Service to interact directly with the WMS MySQL database.
 * Serves as the single master source of truth for:
 *  - Suppliers (users table where role_id = 2)
 *  - Supplier Business Profiles (supplier_business_details table)
 *  - Products & SKUs (products table with global unique SKU constraint)
 *  - Inventories (inventories table with live warehouse current_quantity)
 *  - Order Fulfillments (fulfillment_requests table)
 */

// ── 1. SUPPLIER AUTH & USERS ───────────────────────────────────────────────────

/**
 * Checks if a user already exists in WMS MySQL by email.
 */
export async function findWmsUserByEmail(email) {
  const pool = getMySQLPool()
  if (!pool) return null
  const clean = String(email || '').trim().toLowerCase()
  const rows = await queryWms(
    'SELECT id, name, user_unique_name, email, password, status FROM users WHERE LOWER(email) = ? LIMIT 1',
    [clean]
  )
  return rows && rows.length > 0 ? rows[0] : null
}

/**
 * Checks if a user exists in WMS MySQL by ID.
 */
export async function findWmsUserById(id) {
  const pool = getMySQLPool()
  if (!pool || !id) return null
  const rows = await queryWms(
    'SELECT id, name, user_unique_name, email, status FROM users WHERE id = ? LIMIT 1',
    [id]
  )
  return rows && rows.length > 0 ? rows[0] : null
}

/**
 * Checks if a user exists in WMS MySQL by unique code (e.g. WMS-PAK1035).
 */
export async function findWmsUserByUniqueName(uniqueName) {
  const pool = getMySQLPool()
  if (!pool || !uniqueName) return null
  const clean = String(uniqueName).trim().toUpperCase()
  const rows = await queryWms(
    'SELECT id, name, user_unique_name, email, status FROM users WHERE UPPER(user_unique_name) = ? LIMIT 1',
    [clean]
  )
  return rows && rows.length > 0 ? rows[0] : null
}

/**
 * Generates the next sequential unique WMS Client identifier (e.g. WMS-PAK1006).
 */
export async function generateNextWmsUniqueName() {
  const pool = getMySQLPool()
  if (!pool) return `WMS-PAK${Date.now().toString().slice(-4)}`

  const rows = await queryWms(
    "SELECT user_unique_name FROM users WHERE user_unique_name LIKE 'WMS-PAK%' ORDER BY id DESC LIMIT 1"
  )

  if (rows && rows.length > 0 && rows[0].user_unique_name) {
    const lastNum = parseInt(rows[0].user_unique_name.replace('WMS-PAK', ''), 10)
    if (!isNaN(lastNum)) {
      return `WMS-PAK${lastNum + 1}`
    }
  }

  // Count total suppliers as fallback base
  const countRows = await queryWms('SELECT COUNT(*) as total FROM users')
  const total = countRows?.[0]?.total || 0
  return `WMS-PAK${1001 + total}`
}

/**
 * Ensures extended company, owner, and verification columns exist in supplier_business_details.
 */
let columnsChecked = false
export async function ensureSupplierColumns() {
  if (columnsChecked) return
  const pool = getMySQLPool()
  if (!pool) return

  try {
    const existingCols = await queryWms('SHOW COLUMNS FROM supplier_business_details')
    const colNames = Array.isArray(existingCols) ? existingCols.map((c) => String(c.Field).toLowerCase()) : []
    const toAdd = [
      { name: 'registration_entity', type: 'VARCHAR(100) NULL' },
      { name: 'registration_no', type: 'VARCHAR(100) NULL' },
      { name: 'owner_name', type: 'VARCHAR(255) NULL' },
      { name: 'owner_email', type: 'VARCHAR(255) NULL' },
      { name: 'owner_phone', type: 'VARCHAR(100) NULL' },
      { name: 'owner_address', type: 'TEXT NULL' },
      { name: 'id_card_url', type: 'VARCHAR(255) NULL' },
    ]

    for (const col of toAdd) {
      if (!colNames.includes(col.name)) {
        try {
          await queryWms(`ALTER TABLE supplier_business_details ADD COLUMN \`${col.name}\` ${col.type}`)
        } catch {
          // Ignore if already added concurrently
        }
      }
    }
    columnsChecked = true
  } catch (err) {
    console.warn('[WMS MySQL] ensureSupplierColumns check notice:', err.message)
  }
}

/**
 * Registers a new supplier directly into WMS MySQL users, model_has_roles, and supplier_business_details.
 */
export async function registerWmsSupplier({
  name,
  email,
  password,
  companyName,
  companyEmail,
  companyPhone,
  companyAddress,
  registrationEntity,
  registrationNo,
  ownerName,
  ownerEmail,
  ownerPhone,
  ownerAddress,
  idCardUrl,
}) {
  const pool = getMySQLPool()
  if (!pool) {
    // Resilient Fallback to WMS Bridge HTTP endpoint
    try {
      const bridgeUrl = process.env.WMS_BRIDGE_URL || 'https://wmsbysellvro.com/wms_bridge.php'
      const response = await fetch(`${bridgeUrl}?action=register_supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyEmail,
          companyPhone,
          companyAddress,
          registrationEntity,
          registrationNo,
          ownerName,
          ownerEmail,
          ownerPhone,
          ownerAddress,
          password,
          idCardUrl,
        }),
      })
      const result = await response.json().catch(() => null)
      if (result?.status) {
        return {
          id: result.user_id,
          name: ownerName || name,
          email: ownerEmail || email,
          user_unique_name: result.user_unique_name,
          status: 'pending',
        }
      }
    } catch (httpErr) {
      console.warn('[WMS Bridge] HTTP fallback notice:', httpErr.message)
    }
    throw new Error('WMS MySQL database is not connected.')
  }

  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanName = String(ownerName || name || '').trim()

  // Hash password with bcrypt (100% compatible with Laravel)
  const hashedPassword = await bcrypt.hash(password, 12)
  const uniqueName = await generateNextWmsUniqueName()

  const insertUserSql = `
    INSERT INTO users (name, user_unique_name, email, password, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
  `
  const result = await queryWms(insertUserSql, [cleanName, uniqueName, cleanEmail, hashedPassword])
  const newUserId = result.insertId

  // Assign supplier role (role_id = 2) in model_has_roles
  try {
    await queryWms(
      "INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (2, 'App\\\\Models\\\\User', ?)",
      [newUserId]
    )
  } catch (roleErr) {
    console.warn('[WMS MySQL] Role assignment notice:', roleErr.message)
  }

  // Insert supplier business & owner details
  try {
    await saveWmsSupplierBusinessDetails(newUserId, {
      businessName: companyName || cleanName,
      businessEmail: companyEmail || cleanEmail,
      phone: companyPhone || '',
      address: companyAddress || '',
      registrationEntity: registrationEntity || '',
      registrationNo: registrationNo || '',
      ownerName: ownerName || cleanName,
      ownerEmail: ownerEmail || cleanEmail,
      ownerPhone: ownerPhone || '',
      ownerAddress: ownerAddress || '',
      idCardUrl: idCardUrl || '',
      country: 'Pakistan',
      orderType: 'B2B Wholesale',
    })
  } catch (bizErr) {
    console.warn('[WMS MySQL] saveWmsSupplierBusinessDetails notice:', bizErr.message)
  }

  return {
    id: newUserId,
    name: cleanName,
    email: cleanEmail,
    user_unique_name: uniqueName,
    status: 'pending',
  }
}

/**
 * Verifies supplier credentials against WMS MySQL.
 */
export async function verifyWmsSupplierCredentials(email, password) {
  const pool = getMySQLPool()
  if (!pool) return null

  const user = await findWmsUserByEmail(email)
  if (!user || !user.password) return null

  // Laravel stores bcrypt strings ($2y$ or $2a$)
  const normalizedHash = user.password.replace(/^\$2y\$/, '$2a$')
  const isMatch = await bcrypt.compare(password, normalizedHash).catch(() => false)
  if (!isMatch) return null

  return user
}

// ── 2. SUPPLIER BUSINESS PROFILES ─────────────────────────────────────────────

/**
 * Saves or updates supplier business details in WMS MySQL.
 */
export async function saveWmsSupplierBusinessDetails(userId, details = {}) {
  const pool = getMySQLPool()
  if (!pool || !userId) return null

  await ensureSupplierColumns()

  const existing = await queryWms(
    'SELECT id FROM supplier_business_details WHERE user_id = ? LIMIT 1',
    [userId]
  )

  const {
    businessName = '',
    businessDescription = '',
    categoryId = '1',
    phone = '',
    businessEmail = '',
    address = '',
    country = 'Pakistan',
    city = '',
    orderType = 'B2B Wholesale',
    approxNumber = '100',
    monthlyOrder = '50',
    paymentMethod = 'Bank Transfer',
    accountNumber = '',
    registrationEntity = '',
    registrationNo = '',
    ownerName = '',
    ownerEmail = '',
    ownerPhone = '',
    ownerAddress = '',
    idCardUrl = '',
  } = details

  if (existing && existing.length > 0) {
    const updateSql = `
      UPDATE supplier_business_details
      SET business_name = ?, business_description = ?, category_id = ?, phone = ?,
          business_email = ?, address = ?, country = ?, city = ?, order_type = ?,
          approx_number = ?, monthly_order = ?, payment_method = ?, account_number = ?,
          registration_entity = ?, registration_no = ?, owner_name = ?, owner_email = ?,
          owner_phone = ?, owner_address = ?, id_card_url = ?, updated_at = NOW()
      WHERE user_id = ?
    `
    await queryWms(updateSql, [
      businessName,
      businessDescription,
      String(categoryId),
      phone,
      businessEmail,
      address,
      country,
      city,
      orderType,
      approxNumber,
      monthlyOrder,
      paymentMethod,
      accountNumber,
      registrationEntity,
      registrationNo,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      idCardUrl,
      userId,
    ])
    return { id: existing[0].id, user_id: userId, ...details }
  } else {
    const insertSql = `
      INSERT INTO supplier_business_details
      (user_id, business_name, business_description, category_id, phone, business_email, address,
       country, city, order_type, approx_number, monthly_order, payment_method, account_number,
       registration_entity, registration_no, owner_name, owner_email, owner_phone, owner_address, id_card_url,
       is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `
    const res = await queryWms(insertSql, [
      userId,
      businessName,
      businessDescription,
      String(categoryId),
      phone,
      businessEmail,
      address,
      country,
      city,
      orderType,
      approxNumber,
      monthlyOrder,
      paymentMethod,
      accountNumber,
      registrationEntity,
      registrationNo,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      idCardUrl,
    ])
    return { id: res.insertId, user_id: userId, ...details }
  }
}

// ── 3. UNIFIED PRODUCTS & GLOBAL SKUS ─────────────────────────────────────────

/**
 * Generates the next sequential unique SKU (e.g. SVRO-00021).
 */
export async function generateNextWmsSku() {
  const pool = getMySQLPool()
  if (!pool) return `SVRO-${Date.now().toString().slice(-5)}`

  const rows = await queryWms("SELECT sku FROM products WHERE sku LIKE 'SVRO-%' ORDER BY id DESC LIMIT 1")

  if (rows && rows.length > 0 && rows[0].sku) {
    const match = rows[0].sku.match(/SVRO-(\d+)/)
    if (match && match[1]) {
      const nextNum = parseInt(match[1], 10) + 1
      return `SVRO-${String(nextNum).padStart(5, '0')}`
    }
  }

  const countRows = await queryWms('SELECT COUNT(*) as total FROM products')
  const total = countRows?.[0]?.total || 0
  return `SVRO-${String(total + 1).padStart(5, '0')}`
}

/**
 * Checks if a given SKU already exists in WMS MySQL.
 */
export async function checkWmsSkuExists(sku) {
  const pool = getMySQLPool()
  if (!pool || !sku) return false
  const rows = await queryWms('SELECT id FROM products WHERE sku = ? LIMIT 1', [String(sku).trim().toUpperCase()])
  return rows && rows.length > 0
}

/**
 * Inserts a new product directly into WMS MySQL products table.
 */
export async function createWmsProduct({
  supplierId,
  categoryId = null,
  name,
  sku = null,
  image = '',
  description = '',
  weight = 0,
  weightUnit = 'g',
  length = 0,
  width = 0,
  height = 0,
  dimensionUnit = 'cm',
  brand = '',
  inWarehouse = false,
  fulfillBy = 'client',
  status = 'pending',
}) {
  const pool = getMySQLPool()
  if (!pool) {
    // Resilient Fallback to WMS Bridge HTTP endpoint
    try {
      const bridgeUrl = process.env.WMS_BRIDGE_URL || 'https://wmsbysellvro.com/wms_bridge.php'
      const response = await fetch(`${bridgeUrl}?action=create_product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          categoryId,
          name,
          sku,
          image,
          description,
          weight,
          weightUnit,
          length,
          width,
          height,
          dimensionUnit,
          brand,
          inWarehouse,
          fulfillBy,
          status,
        }),
      })
      const result = await response.json().catch(() => null)
      if (result?.status) {
        return {
          id: result.product_id || result.id,
          name,
          sku,
          status: 'pending',
        }
      }
    } catch (httpErr) {
      console.warn('[WMS Bridge] HTTP fallback notice:', httpErr.message)
    }
    throw new Error('WMS MySQL database is not connected.')
  }

  // Ensure unique SKU
  let finalSku = sku ? String(sku).trim().toUpperCase() : null
  if (!finalSku || (await checkWmsSkuExists(finalSku))) {
    finalSku = await generateNextWmsSku()
  }

  // Normalize image string / json
  let imagePayload = image
  if (Array.isArray(image)) {
    imagePayload = JSON.stringify(image)
  }

  const insertSql = `
    INSERT INTO products
    (supplier_id, category_id, name, sku, image, description, weight, weight_unit,
     length, width, height, dimension_unit, brand, in_warehouse, status, fullfill_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `

  const result = await queryWms(insertSql, [
    supplierId,
    categoryId,
    name,
    finalSku,
    imagePayload,
    description,
    weight,
    weightUnit,
    length,
    width,
    height,
    dimensionUnit,
    brand,
    inWarehouse ? 1 : 0,
    status,
    fulfillBy,
  ])

  const newProductId = result.insertId

  // If in warehouse, initialize stock row in inventories table
  if (inWarehouse) {
    try {
      await queryWms(
        `INSERT INTO inventories (client_id, product_id, location_id, sku, product_title, current_quantity, status, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, 0, 'active', NOW(), NOW())`,
        [supplierId, newProductId, finalSku, name]
      )
    } catch (invErr) {
      console.warn('[WMS MySQL] Inventory initialization notice:', invErr.message)
    }
  }

  return {
    id: newProductId,
    supplierId,
    name,
    sku: finalSku,
    inWarehouse,
    status,
  }
}

/**
 * Retrieves all approved products from WMS MySQL with live inventory stock.
 */
export async function getWmsApprovedProducts() {
  const pool = getMySQLPool()
  if (!pool) return []

  const query = `
    SELECT p.id, p.supplier_id, p.name, p.sku, p.image, p.description, p.weight, p.weight_unit,
           p.brand, p.in_warehouse, p.status, p.fullfill_by,
           COALESCE(i.current_quantity, 0) as stock_quantity,
           u.name as supplier_name, u.user_unique_name as supplier_code,
           sbd.business_name
    FROM products p
    LEFT JOIN inventories i ON i.product_id = p.id
    LEFT JOIN users u ON u.id = p.supplier_id
    LEFT JOIN supplier_business_details sbd ON sbd.user_id = p.supplier_id
    WHERE p.status IN ('approved', 'active')
    ORDER BY p.id DESC
  `
  return await queryWms(query)
}

/**
 * Gets live warehouse quantity for a specific SKU from WMS MySQL inventories.
 */
export async function getWmsLiveStockBySku(sku) {
  const pool = getMySQLPool()
  if (!pool || !sku) return 0

  const rows = await queryWms(
    'SELECT current_quantity FROM inventories WHERE sku = ? LIMIT 1',
    [String(sku).trim().toUpperCase()]
  )
  return rows && rows.length > 0 ? rows[0].current_quantity : 0
}


/**
 * Deducts live warehouse inventory quantity when an order is placed.
 */
export async function deductWmsInventoryStock(sku, quantity) {
  const pool = getMySQLPool()
  if (!pool || !sku || !quantity) return null
  const cleanSku = String(sku).trim().toUpperCase()
  return await queryWms(
    'UPDATE inventories SET current_quantity = GREATEST(0, current_quantity - ?), updated_at = NOW() WHERE sku = ?',
    [Number(quantity), cleanSku]
  )
}

// ── 4. ORDER FULFILLMENT, BATCHES & MASTER BATCHES ─────────────────────────────

/**
 * Gets or creates today's Master Batch in WMS MySQL master_batches table.
 * Standard format: 1-MFBDDMMYY (e.g. 1-MFB111126)
 */
export async function getOrCreateWmsMasterBatch(date = new Date()) {
  const pool = getMySQLPool()
  if (!pool) return null

  const d = new Date(date)
  if (d.getHours() >= 18) {
    d.setDate(d.getDate() + 1)
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  const masterNumber = `1-MFB${day}${month}${year}`
  const masterDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${day}`

  const existing = await queryWms(
    'SELECT id, master_number, total_rows FROM master_batches WHERE master_number = ? LIMIT 1',
    [masterNumber]
  )
  if (existing && existing.length > 0) {
    return existing[0]
  }

  const insertSql = `
    INSERT INTO master_batches (master_number, master_date, status, total_rows, total_customizations, created_at, updated_at)
    VALUES (?, ?, 'open', 0, 0, NOW(), NOW())
  `
  const res = await queryWms(insertSql, [masterNumber, masterDateStr])
  return { id: res.insertId, master_number: masterNumber, total_rows: 0 }
}

/**
 * Gets or creates supplier's fulfillment batch in WMS MySQL batches table.
 * Adheres to 6:00 PM cutoff rule: CBF-WMS-PAKXXXX-DDMMYY
 */
export async function getOrCreateWmsSupplierBatch({
  supplierId,
  supplierCode = 'WMS-PAK1035',
  masterBatchId = null,
  date = new Date(),
}) {
  const pool = getMySQLPool()
  if (!pool) return null

  const d = new Date(date)
  if (d.getHours() >= 18) {
    d.setDate(d.getDate() + 1)
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  const dateStr = `${day}${month}${year}`
  const batchDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${day}`

  const cleanCode = String(supplierCode || '').trim().toUpperCase()
  const code = cleanCode.startsWith('WMS-') ? cleanCode : `WMS-${cleanCode}`
  const batchNumber = `CBF-${code}-${dateStr}`

  const existing = await queryWms(
    'SELECT id, batch_number, total_rows, master_batch_id FROM batches WHERE batch_number = ? LIMIT 1',
    [batchNumber]
  )
  if (existing && existing.length > 0) {
    return existing[0]
  }

  const insertSql = `
    INSERT INTO batches (supplier_id, batch_type, created_by, batch_number, batch_date, default_commission, master_batch_id, status, total_rows, total_customizations, created_at, updated_at)
    VALUES (?, 'client', ?, ?, ?, 0.00, ?, 'open', 0, 0, NOW(), NOW())
  `
  const res = await queryWms(insertSql, [supplierId, supplierId, batchNumber, batchDateStr, masterBatchId])
  return { id: res.insertId, batch_number: batchNumber, total_rows: 0, master_batch_id: masterBatchId }
}

/**
 * Pushes a marketplace order directly into WMS MySQL with full Master Batch and Daily Batch linkage.
 */
export async function createWmsFulfillmentRequest({
  clientId,
  supplierId,
  supplierCode = 'WMS-PAK1035',
  sku,
  quantity = 1,
  carrier = 'fedex',
  trackingNumber = '',
  labelPdf = '',
  customizations = '',
  locationId = null,
}) {
  const pool = getMySQLPool()
  if (!pool) return null

  const finalSupplierId = supplierId || clientId || 36
  const cleanSku = String(sku || '').trim().toUpperCase()
  const allowedWmsCarriers = ['usps', 'fedex', 'dhl', 'ups']
  const rawCarrier = String(carrier || 'fedex').trim().toLowerCase()
  const cleanCarrier = allowedWmsCarriers.includes(rawCarrier) ? rawCarrier : 'fedex'
  const cleanTracking = String(trackingNumber || '').trim()
  const qty = Math.max(1, Number(quantity || 1))

  // 1. Resolve Location ID from Inventory
  let targetLocationId = locationId
  if (!targetLocationId) {
    try {
      const invRows = await queryWms('SELECT location_id, id, current_quantity FROM inventories WHERE sku = ? LIMIT 1', [cleanSku])
      if (invRows && invRows.length > 0 && invRows[0].location_id) {
        targetLocationId = invRows[0].location_id
      }
    } catch { /* ignore */ }
  }
  if (!targetLocationId) targetLocationId = 2 // default to Section B

  // 2. Get or create Master Batch (Admin & Warehouse grouping)
  const masterBatch = await getOrCreateWmsMasterBatch()
  const masterBatchId = masterBatch?.id || null

  // 3. Get or create Supplier Daily Batch (6:00 PM cutoff)
  const supplierBatch = await getOrCreateWmsSupplierBatch({
    supplierId: finalSupplierId,
    supplierCode,
    masterBatchId,
  })
  const batchId = supplierBatch?.id || null
  const batchNumber = supplierBatch?.batch_number || `CBF-${supplierCode}-${Date.now()}`

  // 4. Calculate sequential request number: e.g. 1-CBF-WMS-PAK1035-111126
  const nextRow = (supplierBatch?.total_rows || 0) + 1
  const requestNumber = `${nextRow}-${batchNumber}`

  // 5. Insert into fulfillment_requests table
  const insertFrSql = `
    INSERT INTO fulfillment_requests
    (request_number, client_id, supplier_id, location_id, sku, quantity, carrier, tracking_number,
     tracking_status, tracking_status_detail, label_pdf, customizations, source, status,
     batch_id, master_batch_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_api', 'Carrier tracking assigned.', ?, ?, 'marketplace', 'pending', ?, ?, NOW(), NOW())
  `
  const res = await queryWms(insertFrSql, [
    requestNumber,
    finalSupplierId,
    finalSupplierId,
    targetLocationId,
    cleanSku,
    qty,
    cleanCarrier,
    cleanTracking,
    labelPdf || 'labels/pending_label.pdf',
    customizations,
    batchId,
    masterBatchId,
  ])
  const fulfillmentId = res.insertId

  // 6. Update Batches total rows count
  if (batchId) {
    await queryWms(
      'UPDATE batches SET total_rows = total_rows + 1, total_customizations = total_customizations + 1, updated_at = NOW() WHERE id = ?',
      [batchId]
    ).catch(() => { })
  }
  if (masterBatchId) {
    await queryWms(
      'UPDATE master_batches SET total_rows = total_rows + 1, total_customizations = total_customizations + 1, updated_at = NOW() WHERE id = ?',
      [masterBatchId]
    ).catch(() => { })
  }

  // 7. Atomic Inventory Deduction & Inventory Log Record
  try {
    const inv = await queryWms('SELECT id, current_quantity FROM inventories WHERE sku = ? LIMIT 1', [cleanSku])
    if (inv && inv.length > 0) {
      const prevQty = Number(inv[0].current_quantity || 0)
      const newQty = Math.max(0, prevQty - qty)
      await queryWms(
        'UPDATE inventories SET current_quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQty, inv[0].id]
      )
      await queryWms(
        'INSERT INTO inventory_logs (inventory_id, sku, previous_quantity, new_quantity, difference, change_type, remarks, created_at) VALUES (?, ?, ?, ?, ?, "sale", ?, NOW())',
        [inv[0].id, cleanSku, prevQty, newQty, -qty, `Marketplace Order: ${requestNumber}`]
      ).catch(() => { })
    }
  } catch (invErr) {
    console.warn('[WMS Inventory Update Notice]:', invErr.message)
  }

  return {
    id: fulfillmentId,
    requestNumber,
    batchNumber,
    masterBatchNumber: masterBatch?.master_number || null,
    batchId,
    masterBatchId,
    status: 'pending',
  }
}

/**
 * Updates carrier and live tracking number in WMS fulfillment_requests.
 * Ensures WMS Warehouse dashboard immediately displays the real tracking ID.
 */
export async function updateWmsOrderTracking({ requestNumber, orderNo, carrier, trackingNumber }) {
  const pool = getMySQLPool()
  if (!pool) return null

  try {
    const cleanCarrier = String(carrier || '').trim().toLowerCase()
    const cleanTracking = String(trackingNumber || '').trim()

    let query = ''
    let params = []

    if (requestNumber) {
      query = 'UPDATE fulfillment_requests SET carrier = ?, tracking_number = ?, updated_at = NOW() WHERE request_number = ?'
      params = [cleanCarrier, cleanTracking, requestNumber]
    } else if (orderNo) {
      query = 'UPDATE fulfillment_requests SET carrier = ?, tracking_number = ?, updated_at = NOW() WHERE customizations LIKE ?'
      params = [cleanCarrier, cleanTracking, `%${orderNo}%`]
    }

    if (query) {
      return await queryWms(query, params)
    }
  } catch (err) {
    console.warn('[WMS SQL] Failed to update tracking in MySQL:', err.message)
  }
  return null
}

/**
 * Cancels a fulfillment request in WMS MySQL and restores inventory stock.
 */
export async function cancelWmsOrder({ requestNumber, orderNo, sku, quantity }) {
  const pool = getMySQLPool()
  if (!pool) return null

  try {
    // 1. Mark fulfillment request as cancelled in WMS
    if (requestNumber) {
      await queryWms(
        "UPDATE fulfillment_requests SET status = 'cancelled', updated_at = NOW() WHERE request_number = ? LIMIT 1",
        [requestNumber]
      )
    } else if (orderNo) {
      await queryWms(
        "UPDATE fulfillment_requests SET status = 'cancelled', updated_at = NOW() WHERE customizations LIKE ? LIMIT 1",
        [`%${orderNo}%`]
      )
    }

    // 2. Restore live warehouse inventory stock
    if (sku && quantity) {
      const cleanSku = String(sku).trim().toUpperCase()
      await queryWms(
        'UPDATE inventories SET current_quantity = current_quantity + ?, updated_at = NOW() WHERE sku = ?',
        [Number(quantity), cleanSku]
      )
    }
    return true
  } catch (err) {
    console.warn('[WMS SQL] Failed to cancel WMS order in MySQL:', err.message)
    return false
  }
}

export default {
  findWmsUserByEmail,
  findWmsUserById,
  findWmsUserByUniqueName,
  generateNextWmsUniqueName,
  registerWmsSupplier,
  verifyWmsSupplierCredentials,
  saveWmsSupplierBusinessDetails,
  generateNextWmsSku,
  checkWmsSkuExists,
  createWmsProduct,
  getWmsApprovedProducts,
  getWmsLiveStockBySku,
  deductWmsInventoryStock,
  createWmsFulfillmentRequest,
  getOrCreateWmsMasterBatch,
  getOrCreateWmsSupplierBatch,
  updateWmsOrderTracking,
  cancelWmsOrder,
}
