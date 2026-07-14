import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import businessRoutes from './routes/businessRoutes.js'
import adminRoutes from './routes/adminRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Sellvro API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/admin', adminRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.message?.startsWith('CORS') ? 403 : 500).json({ message: err.message || 'Server error' })
})

const startServer = async () => {
  await connectDB()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer().catch((error) => {
  const message = error.message || String(error)
  console.error('Failed to start server:', message)

  if (message.toLowerCase().includes('bad auth') || message.toLowerCase().includes('authentication failed')) {
    console.error(`
MongoDB Authentication failed.
Fix: Atlas → Database Access → reset DB user password, then update MONGODB_URI.
`)
  } else if (message.includes('whitelist') || String(error.name || '').includes('ServerSelection')) {
    console.error(`
MongoDB Atlas is blocking this IP.
Fix: Atlas → Network Access → Allow Access from Anywhere (0.0.0.0/0)
`)
  }

  process.exit(1)
})
