import dotenv from 'dotenv'

dotenv.config()

let mysql = null
try {
  const mod = await import('mysql2/promise')
  mysql = mod.default || mod
} catch {
  // Graceful fallback if mysql2 is not installed in production node_modules
  mysql = null
}

let pool = null
let mysqlStatus = mysql ? 'unconfigured' : 'driver_missing'
let mysqlMessage = mysql 
  ? 'WMS MySQL credentials not configured in .env' 
  : 'mysql2 driver not installed in node_modules (REST API is active)'

/**
 * Lazily initializes and returns the MySQL connection pool for WMS.
 */
export function getMySQLPool() {
  if (!mysql) {
    return null
  }

  if (pool) return pool

  const host = process.env.WMS_DB_HOST || process.env.MYSQL_HOST
  const user = process.env.WMS_DB_USER || process.env.MYSQL_USER
  const password = process.env.WMS_DB_PASSWORD || process.env.MYSQL_PASSWORD || ''
  const database = process.env.WMS_DB_NAME || process.env.MYSQL_DATABASE
  const port = Number(process.env.WMS_DB_PORT || process.env.MYSQL_PORT || 3306)

  if (!host || !user || !database) {
    mysqlStatus = 'unconfigured'
    mysqlMessage = 'WMS_DB_HOST, WMS_DB_USER, or WMS_DB_NAME is missing in .env'
    return null
  }

  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    })
    return pool
  } catch (err) {
    mysqlStatus = 'error'
    mysqlMessage = err.message
    console.error('[WMS MySQL] Failed to create pool:', err.message)
    return null
  }
}

/**
 * Tests the WMS MySQL connection without throwing an unhandled exception.
 */
export async function checkMySQLConnection() {
  if (!mysql) {
    return { status: mysqlStatus, message: mysqlMessage }
  }

  const currentPool = getMySQLPool()
  if (!currentPool) {
    return { status: mysqlStatus, message: mysqlMessage }
  }

  try {
    const [rows] = await currentPool.query('SELECT 1 as connected')
    if (rows && rows[0]?.connected === 1) {
      mysqlStatus = 'connected'
      mysqlMessage = `Connected to WMS MySQL (${process.env.WMS_DB_NAME || process.env.MYSQL_DATABASE})`
      console.log(`[WMS MySQL] Successfully connected to database: ${process.env.WMS_DB_NAME || process.env.MYSQL_DATABASE}`)
      return { status: mysqlStatus, message: mysqlMessage }
    }
  } catch (err) {
    mysqlStatus = 'error'
    mysqlMessage = `MySQL connection error: ${err.message}`
    console.warn(`[WMS MySQL Warning] Could not connect: ${err.message}`)
    return { status: mysqlStatus, message: mysqlMessage }
  }
}

/**
 * Helper to run queries safely with prepared statements against WMS MySQL.
 */
export async function queryWms(sql, params = []) {
  if (!mysql) {
    throw new Error(`[WMS MySQL Not Available] ${mysqlMessage}`)
  }

  const currentPool = getMySQLPool()
  if (!currentPool) {
    throw new Error(`[WMS MySQL Not Connected] ${mysqlMessage}`)
  }
  const [results] = await currentPool.query(sql, params)
  return results
}

/**
 * Returns current status of MySQL connection for health/diagnostics.
 */
export function getMySQLStatus() {
  return { status: mysqlStatus, message: mysqlMessage }
}

export default {
  getMySQLPool,
  checkMySQLConnection,
  queryWms,
  getMySQLStatus,
}
