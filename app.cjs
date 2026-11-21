/**
 * cPanel / aaPanel / Phusion Passenger Application Entry Point
 * Pure CommonJS (.cjs) — 100% compatible with Passenger on Node.js 18, 20 & 22
 *
 * Strategy:
 *  - Bind to PORT synchronously (Passenger requires a listening server FAST)
 *  - Serve a loading page until the ESM backend finishes loading
 *  - If an error occurs during loading, display the error clearly
 *  - Attach Express once backend is ready
 */
'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

// ── Logging ───────────────────────────────────────────────────────────────────
const logFile = path.join(process.cwd(), 'stderr.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stderr.write(line)
  try { fs.appendFileSync(logFile, line) } catch (_) { }
}

// ── Load .env FIRST before reading any env vars ───────────────────────────────
try {
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
let startupError = null

process.on('uncaughtException', (err) => {
  startupError = err.stack || err.message || String(err)
  log(`FATAL uncaughtException: ${startupError}`)
})
process.on('unhandledRejection', (reason) => {
  startupError = reason && (reason.stack || reason.message || String(reason))
  log(`FATAL unhandledRejection: ${startupError}`)
})

// ── Port resolution ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000

// ── HTTP server (binds immediately) ──────────────────────────────────────────
let expressApp = null

const server = http.createServer((req, res) => {
  if (expressApp) {
    return expressApp(req, res)
  }

  if (startupError) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sellvro — Server Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #0f172a; color: #f87171; }
    .box { background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155; color: #e2e8f0; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
    h2 { color: #ef4444; margin-top: 0; }
    p { color: #94a3b8; }
    button { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; }
  </style>
</head>
<body>
  <h2>⚠️ Sellvro Backend Startup Notice</h2>
  <p>The backend encountered an issue while loading. See details below:</p>
  <div class="box">${startupError}</div>
  <button onclick="window.location.reload()">Retry Connection</button>
</body>
</html>`)
  }

  // Loading splash shown while backend initialises
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3">
  <title>Sellvro — Starting</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 80px 20px; background: #0f172a; color: #e2e8f0; }
    .spinner { display: inline-block; width: 44px; height: 44px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 24px; margin-bottom: 8px; font-weight: 700; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Starting Sellvro...</h2>
  <p>Connecting to database & initialising services. This page will auto-refresh in 3 seconds.</p>
</body>
</html>`)
})

server.listen(PORT, () => {
  log(`HTTP server listening on port/socket: ${PORT}`)
})

// ── Export for Phusion Passenger ──────────────────────────────────────────────
module.exports = server

// ── Load the ESM Express backend asynchronously ───────────────────────────────
import('./server/server.js')
  .then((mod) => {
    expressApp = mod.default || mod.app
    if (!expressApp || typeof expressApp !== 'function') {
      throw new Error(
        'server/server.js did not export a valid Express app. Ensure it has: export default app'
      )
    }
    log('Express app attached to HTTP server successfully. Sellvro is READY.')
  })
  .catch((err) => {
    startupError = err.stack || err.message || String(err)
    log(`FATAL: Failed to load server/server.js: ${startupError}`)
  })
