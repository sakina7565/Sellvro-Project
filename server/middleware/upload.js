import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uuid = crypto.randomUUID()
    cb(null, `${Date.now()}-${uuid}${ext}`)
  },
})

function fileFilter(_req, file, cb) {
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/jfif',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg',
    'video/x-matroska',
  ]
  const ext = path.extname(file.originalname || '').toLowerCase()
  const isAllowedExt = /\.(jpe?g|jfif|pjpeg|pjp|png|webp|gif|pdf|mp4|webm|mov|ogg|mkv)$/i.test(ext)

  if (!allowed.includes(file.mimetype) && !isAllowedExt) {
    return cb(new Error('Only PDF documents, JPG, JPEG, JFIF, PNG, WEBP, GIF images and MP4, WEBM videos are allowed.'))
  }
  return cb(null, true)
}

export const productUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
})
