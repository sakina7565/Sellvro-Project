/**
 * cPanel / Phusion Passenger Application Entry Point
 * Pure CommonJS (.js) — compatible with Passenger on Node.js 18, 20 & 22
 *
 * Strategy:
 *  - Bind to PORT synchronously (Passenger requires a listening server FAST)
 *  - Serve a loading page until the ESM backend finishes loading
 *  - Attach Express once backend is ready
 */
'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

// ── Logging ──────────────────────────────────────────────────────────────────
const logFile = path.join(process.cwd(), 'stderr.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stderr.write(line)
  try { fs.appendFileSync(logFile, line) } catch (_) {}
}

// ── Load .env FIRST before reading any env vars ───────────────────────────────
try {
  // Try root-level .env (production cPanel: uploaded alongside app.js)
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath })
    log(`.env loaded from: ${envPath}`)
  } else {
    log('WARNING: No .env file found in cwd. Relying on system environment variables.')
  }
} catch (e) {
  log(`WARNING: dotenv load failed: ${e.message}`)
}

// ── Startup info ──────────────────────────────────────────────────────────────
log(`=== Starting Sellvro on Node.js ${process.version} (PID: ${process.pid}) ===`)
log(`Working directory: ${process.cwd()}`)
log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
log(`PASSENGER_APP_ROOT: ${process.env.PASSENGER_APP_ROOT || 'not set'}`)
log(`PORT env: ${process.env.PORT || 'not set — will default to 5000'}`)

// ── Global error guards ───────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log(`FATAL uncaughtException: ${err.stack || err.message || err}`)
})
process.on('unhandledRejection', (reason) => {
  log(`FATAL unhandledRejection: ${reason && (reason.stack || reason.message || reason)}`)
})

// ── Port / socket resolution ──────────────────────────────────────────────────
// Phusion Passenger may pass a Unix socket path OR a TCP port via process.env.PORT
const PORT = process.env.PORT || 5000

// ── HTTP server (binds immediately) ──────────────────────────────────────────
let expressApp = null

const server = http.createServer((req, res) => {
  if (expressApp) {
    return expressApp(req, res)
  }
  // Loading splash shown while backend initialises
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3">
  <title>Sellvro — Starting</title>
  <style>body{font-family:sans-serif;text-align:center;padding:80px;background:#0f172a;color:#e2e8f0}</style>
</head>
<body>
  <h2>⚙️ Starting Sellvro...</h2>
  <p>Server is initialising. This page will auto-refresh in 3 seconds.</p>
</body>
</html>`)
})

server.listen(PORT, () => {
  log(`HTTP server listening on port/socket: ${PORT}`)
})

// ── Export for Phusion Passenger ──────────────────────────────────────────────
module.exports = server

// ── Load the ESM Express backend asynchronously ───────────────────────────────
// Dynamic import() works in CJS files in Node.js 12+ and correctly loads ES Modules
import('./server/server.js')
  .then((mod) => {
    expressApp = mod.default || mod.app
    if (!expressApp || typeof expressApp !== 'function') {
      throw new Error(
        'server/server.js did not export a valid Express app. ' +
        'Ensure it has: export default app'
      )
    }
    log('Express app attached to HTTP server successfully. Sellvro is READY.')
  })
  .catch((err) => {
    log(`FATAL: Failed to load server/server.js: ${err.stack || err.message || err}`)
  })

