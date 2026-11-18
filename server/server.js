import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import connectDB, { isDbConnected } from './config/db.js'
import { checkMySQLConnection, getMySQLStatus } from './config/mysql.js'
import authRoutes from './routes/authRoutes.js'
import businessRoutes from './routes/businessRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import productRoutes from './routes/productRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import disputeRoutes from './routes/disputeRoutes.js'
import financeRoutes from './routes/financeRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import { UPLOADS_DIR } from './middleware/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Load .env FIRST — must happen before any process.env reads ──────────────────────
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config() // fallback: load from process.cwd()/.env

const app = express()
const PORT = process.env.PORT || 5000
app.set('trust proxy', 1)

let dbStatus = 'connecting'
let dbMessage = 'Connecting to MongoDB Atlas...'

app.disable('x-powered-by')

// Security headers (M6)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Only directives that cannot block the app's scripts, styles, images or Google sign-in.
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'")
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  next()
})

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://sellvro.com',
  'https://www.sellvro.com',
]

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])]

const apiCors = cors({
  origin(origin, callback) {
    // Allow non-browser tools (no Origin) and configured frontends
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true)
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
})

// Static uploads allow cross-origin resource sharing for product/receipt media (404 for missing files per M4)
app.use('/uploads', cors(), express.static(UPLOADS_DIR))

// Apply strict CORS and body parsers to /api routes
app.use('/api', apiCors)
app.use(cookieParser())
app.use(express.json())

// M2: Handle invalid JSON error & default empty body
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload received in request body.' })
  }
  next(err)
})
app.use((req, _res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {}
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Sellvro API is running',
    database: {
      status: dbStatus,
    },
    port: PORT,
  })
})

// M3: Fast 503 database readiness guard for all API endpoints (blocks buffer hang)
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/healthcheck') {
    return next()
  }

  if (mongoose.connection.readyState !== 1) {
    if (mongoose.connection.readyState === 0) connectDB().catch(() => { })
    return res.status(503).json({
      message: 'Database is currently connecting or temporarily unavailable. Please retry shortly.',
    })
  }

  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/disputes', disputeRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/search', searchRoutes)

// M5: Unknown API routes return JSON 404 (not HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl || req.url}` })
})

// Serve production static frontend if dist directory exists (e.g. cPanel single-app deployment)
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(process.cwd(), 'dist'),
]
const distPath = candidateDistPaths.find((p) => fs.existsSync(p))

if (distPath) {
  app.use(express.static(distPath))

  // SPA fallback for all frontend client-side routes (React Router)
  // Note: Express 5 requires named wildcards — bare `*` is not supported
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.message?.startsWith('CORS') ? 403 : 500).json({ message: err.message || 'Server error' })
})

// Connect to WMS MySQL
checkMySQLConnection().catch(() => { })

// Connect to MongoDB
connectDB()
  .then((conn) => {
    dbStatus = 'connected'
    dbMessage = `Connected to ${conn.connection.host}`
    console.log(`MongoDB connected successfully: ${conn.connection.host}`)
  })
  .catch((error) => {
    dbStatus = 'error'
    const msg = error.message || String(error)
    dbMessage = msg
    console.error('MongoDB connection error:', msg)

    if (msg.toLowerCase().includes('bad auth') || msg.toLowerCase().includes('authentication failed')) {
      console.error(`
[MONGODB ERROR] Database Authentication failed.
Fix: Atlas -> Database Access -> reset DB user password, then update MONGODB_URI.
`)
    } else if (msg.includes('whitelist') || String(error.name || '').includes('ServerSelection')) {
      console.error(`
[ACTION REQUIRED ON MONGODB ATLAS]
Your cPanel server IP is not whitelisted in MongoDB Atlas.
To fix:
1. Log into https://cloud.mongodb.com
2. Go to Security -> Network Access
3. Click 'Add IP Address' -> 'Allow Access from Anywhere' (0.0.0.0/0) or add your cPanel server IP.
`)
    }
  })

// ── Start listening ──────────────────────────────────────────────────────────────
// When run directly (e.g. `node server/server.js`) we bind to PORT ourselves.
// When loaded via `import()` from app.js/app.cjs, app.js creates the HTTP server.
const argv1 = process.argv[1] || ''
const isDirectRun = argv1.endsWith('server.js') || argv1.endsWith('server/server.js')
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`[Sellvro] Server listening on port ${PORT} (direct run)`)
  })
}

export default app
export { app }
