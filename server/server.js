import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import connectDB from './config/db.js'
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

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://sellvro.com',
]

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])]

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin) and configured frontends
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))
app.use('/uploads', (_req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.status(200).send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#g)"/>
      <g fill="#94a3b8" transform="translate(180, 180) scale(10)">
        <path d="M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4zm0 2h16v8.586l-4.293-4.293a1 1 0 0 0-1.414 0L8.586 15l-1.879-1.879a1 1 0 0 0-1.414 0L4 14.414V5zm16 14H4v-1.758l2-2 1.879 1.879a1 1 0 0 0 1.414 0L15 11.414l5 5V19zm-5.5-11a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
      </g>
      <text x="300" y="450" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#475569" text-anchor="middle">Sellvro Verified Catalog</text>
      <text x="300" y="475" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">Image stored in cloud warehouse</text>
    </svg>
  `)
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Sellvro API is running',
    database: {
      status: dbStatus,
      message: dbMessage,
    },
    node: process.version,
    port: PORT,
    cwd: process.cwd(),
  })
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
