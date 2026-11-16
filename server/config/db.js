import dns from 'dns'
import mongoose from 'mongoose'

// Ensure IPv4 is preferred for network resolution
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first')
  } catch (e) {
    // Ignore if not supported in current environment
  }
}

let isConnecting = false
let reconnectTimer = null

const scheduleReconnect = () => {
  if (reconnectTimer || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    console.log('[MongoDB] Retrying connection to MongoDB Atlas...')
    connectDB().catch(() => {})
  }, 5000)
}

mongoose.connection.on('connected', () => {
  console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}`)
})

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Scheduling automatic reconnect...')
  scheduleReconnect()
})

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message)
  scheduleReconnect()
})

/**
 * Connects to MongoDB Atlas using MONGODB_URI from .env.
 * Exports the mongoose connection for reuse across the app.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to your .env file.')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (isConnecting) {
    return mongoose.connection
  }

  isConnecting = true
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    })
    return conn
  } catch (err) {
    scheduleReconnect()
    throw err
  } finally {
    isConnecting = false
  }
}

export const isDbConnected = () => mongoose.connection.readyState === 1

export default connectDB
