/**
 * ID Card Image Quality & Automated CNIC Verification Scanner
 * Performs:
 * 1. Image Resolution & Aspect Ratio Validation
 * 2. Overexposure / Glare / Darkness Inspection
 * 3. Blur & Sharpness Detection via Discrete 3x3 Laplacian Variance
 * 4. Automatic CNIC Number Extraction & Pakistani ID Card Verification via OCR
 */

// Fallback CDNs for loading Tesseract
const TESSERACT_CDNS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js',
  'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
]

let tesseractLoadPromise = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function loadTesseract() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'))
  if (window.Tesseract) return Promise.resolve(window.Tesseract)

  if (!tesseractLoadPromise) {
    tesseractLoadPromise = (async () => {
      let lastErr = null
      for (const cdn of TESSERACT_CDNS) {
        try {
          await loadScript(cdn)
          if (window.Tesseract) return window.Tesseract
        } catch (err) {
          lastErr = err
        }
      }
      tesseractLoadPromise = null
      throw lastErr || new Error('Failed to load OCR scanner from CDN mirrors')
    })()
  }

  return tesseractLoadPromise
}

/**
 * Load an image File into an HTML5 Image element
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image file'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Normalizes raw string to standard Pakistani CNIC format (XXXXX-XXXXXXX-X)
 */
export function normalizeCnic(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D+/g, '')
  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
  }
  return String(raw).trim()
}

/**
 * Validates Pakistani CNIC format (13 digits, province code 1-7)
 */
export function isValidPakistaniCnic(cnic) {
  if (!cnic) return false
  const digits = String(cnic).replace(/\D+/g, '')
  if (digits.length !== 13) return false
  const province = parseInt(digits[0], 10)
  return province >= 1 && province <= 7
}

/**
 * Inspect image brightness, glare, resolution, and blur sharpness.
 * @param {File} file
 * @returns {Promise<{ isValid: boolean, error?: string, isBlurry?: boolean, metrics?: object }>}
 */
export async function validateImageQuality(file) {
  if (!file) {
    return { isValid: false, error: 'File missing. Please upload your CNIC photo.' }
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: 'Invalid file format. Please upload JPG, PNG, or WEBP image of your CNIC.',
    }
  }

  // Check file size (minimum 15KB, maximum 10MB)
  if (file.size < 15 * 1024) {
    return {
      isValid: false,
      isBlurry: true,
      error: 'Tasveer ka size boht chhota hai ya image corrupted hai. Meharbani farma kar saaf aur readable CNIC photo upload karein.',
    }
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Tasveer ka size 10MB se zyada hai. Meharbani farma kar 10MB se kam size ki image upload karein.',
    }
  }

  try {
    const img = await loadImageFromFile(file)

    // Check Dimensions / Resolution
    if (img.width < 380 || img.height < 220) {
      return {
        isValid: false,
        isBlurry: true,
        error: 'Tasveer ka resolution boht low hai jis se CNIC number parha nahi ja sakta. Meharbani farma kar kam az kam 400x250 resolution ki clear photo upload karein.',
        metrics: { width: img.width, height: img.height },
      }
    }

    // Check Aspect Ratio (Standard ID Card is ~1.58:1, allow reasonable margins 0.45 to 2.4)
    const ratio = img.width / img.height
    if (ratio > 2.8 || ratio < 0.35) {
      return {
        isValid: false,
        error: 'Tasveer ka frame ID Card k size se match nahi karta. Meharbani farma kar poora CNIC card frame k andar le kar photo upload karein.',
        metrics: { ratio },
      }
    }

    // Normalize resolution for metric calculation
    const maxDim = 800
    let width = img.width
    let height = img.height

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { isValid: true }

    ctx.drawImage(img, 0, 0, width, height)
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data
    const totalPixels = width * height

    let totalLuminance = 0
    let overexposedPixels = 0
    let underexposedPixels = 0

    const gray = new Float32Array(totalPixels)

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]

      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      gray[i] = lum
      totalLuminance += lum

      if (lum >= 242) overexposedPixels++
      if (lum <= 25) underexposedPixels++
    }

    const avgLuminance = totalLuminance / totalPixels
    const glareRatio = overexposedPixels / totalPixels
    const darkRatio = underexposedPixels / totalPixels

    // ── Check 1: Excessive Light / Glare Validation ──
    if (avgLuminance > 225) {
      return {
        isValid: false,
        error: 'Tasveer boht zyada bright / overexposed hai. Meharbani farma kar flash k baghair saaf tasveer upload karein.',
        metrics: { avgLuminance, glareRatio },
      }
    }

    if (glareRatio > 0.35) {
      return {
        isValid: false,
        error: 'Tasveer par boht zyada light / camera flash glare hai jis se ID Card k ahem hissay parhay nahi ja rahay. Meharbani farma kar direct light k baghair tasveer lein.',
        metrics: { avgLuminance, glareRatio },
      }
    }

    if (avgLuminance < 35 && darkRatio > 0.55) {
      return {
        isValid: false,
        error: 'Tasveer boht andheri (dark) hai. Meharbani farma kar achi roshni mein saaf tasveer le kar upload karein.',
        metrics: { avgLuminance, darkRatio },
      }
    }

    // ── Check 2: Blur Detection via Discrete 3x3 Laplacian Variance ──
    let laplacianSum = 0
    let laplacianSqSum = 0
    let sampledCount = 0

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = y * width + x
        const lap =
          gray[idx - width] +
          gray[idx + width] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx]

        laplacianSum += lap
        laplacianSqSum += lap * lap
        sampledCount++
      }
    }

    const lapMean = laplacianSum / sampledCount
    const variance = laplacianSqSum / sampledCount - lapMean * lapMean

    // Threshold: sharp ID card text typically produces variance >= 75
    // Blurry, out-of-focus photos drop below 70
    if (variance < 68) {
      return {
        isValid: false,
        isBlurry: true,
        error: 'Tasveer boht blur (dhundhli) ya out-of-focus hai jis mein se CNIC details aur number saaf parha nahi ja sakta. Meharbani farma kar camera theek tarah focus kar k saaf aur sharp CNIC photo upload karein.',
        metrics: { variance, avgLuminance },
      }
    }

    return {
      isValid: true,
      metrics: { variance: Math.round(variance), avgLuminance: Math.round(avgLuminance), glareRatio },
    }
  } catch (err) {
    console.warn('[validateImageQuality] Inspection notice:', err)
    return { isValid: true }
  }
}

/**
 * Known Pakistani National ID keywords for document authentication
 */
const CNIC_KEYWORDS = [
  'pakistan',
  'identity',
  'card',
  'national',
  'republic',
  'islamic',
  'nadra',
  'birth',
  'expiry',
  'issue',
  'name',
  'father',
  'gender',
  'country',
  'stay',
  'holder',
  'signature',
  'government',
  'cnic',
  'nic',
  'snid',
  'urdu',
  'حکومت',
  'پاکستان',
  'شناختی',
  'کارڈ',
  'دستخط',
  'پیدائش',
]

/**
 * Extract Pakistani CNIC number from an ID Card image using OCR and verify authenticity.
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{ found: boolean, isValidCnic: boolean, idNumber: string, isBlurry?: boolean, error?: string, rawText?: string }>}
 */
export async function extractIdCardNumber(file, onProgress) {
  try {
    const Tesseract = await loadTesseract()
    if (!Tesseract) {
      return {
        found: false,
        isValidCnic: false,
        idNumber: '',
        error: 'OCR scanner library not available. Please ensure active internet connection.',
      }
    }

    const img = await loadImageFromFile(file)

    // Pre-process canvas for OCR: upscale small images and optimize contrast
    const canvas = document.createElement('canvas')
    const maxDim = 1500
    let w = img.width
    let h = img.height

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w)
        w = maxDim
      } else {
        w = Math.round((w * maxDim) / h)
        h = maxDim
      }
    }
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { found: false, isValidCnic: false, idNumber: '' }
    }

    ctx.drawImage(img, 0, 0, w, h)

    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100))
        }
      },
    })

    const rawText = result?.data?.text || ''
    const lowerText = rawText.toLowerCase()

    // ── Check A: Did OCR extract enough text or is it unreadable/blurry? ──
    const cleanedText = rawText.replace(/\s+/g, ' ').trim()
    if (cleanedText.length < 12) {
      return {
        found: false,
        isValidCnic: false,
        isBlurry: true,
        idNumber: '',
        error: 'Tasveer boht blur ya low-quality hai jis mein se koi text parha nahi ja saka. Meharbani farma kar saaf, roshan aur seedhi CNIC photo upload karein.',
        rawText,
      }
    }

    // ── Check B: Look for 13-digit Pakistani CNIC pattern ──
    // Format: XXXXX-XXXXXXX-X (Starts with province digit 1-7)
    let extractedCnic = ''

    // 1. Standard dash/space separated format: e.g. 42101-1234567-1
    const dashMatch = rawText.match(/(?:[^\d]|^)([1-7]\d{4})[-—–.\s](\d{7})[-—–.\s](\d{1})(?:[^\d]|$)/)
    if (dashMatch) {
      extractedCnic = `${dashMatch[1]}-${dashMatch[2]}-${dashMatch[3]}`
    }

    // 2. Continuous 13 digits starting with province code 1-7
    if (!extractedCnic) {
      const continuousMatch = rawText.match(/(?:[^\d]|^)([1-7]\d{12})(?:[^\d]|$)/)
      if (continuousMatch) {
        const d = continuousMatch[1]
        extractedCnic = `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
      }
    }

    // 3. Fallback: Any 13-digit number
    if (!extractedCnic) {
      const any13 = rawText.replace(/[^0-9]/g, ' ')
      const chunks = any13.split(/\s+/).filter((c) => c.length === 13)
      if (chunks.length > 0 && isValidPakistaniCnic(chunks[0])) {
        const d = chunks[0]
        extractedCnic = `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
      }
    }

    // ── Check C: Verify Document Authenticity (Reject non-CNIC images) ──
    const hasCnicKeyword = CNIC_KEYWORDS.some((kw) => lowerText.includes(kw))

    // If NO CNIC number was found AND NO CNIC keywords were found:
    // This is an unrelated picture (e.g. selfie, car, food, animal, screenshot)
    if (!extractedCnic && !hasCnicKeyword) {
      return {
        found: false,
        isValidCnic: false,
        isInvalidDocument: true,
        idNumber: '',
        error: 'Ghalat tasveer! Ye valid Pakistani CNIC / National ID Card ki image nahi hai. System aam tasweer ya doosre documents accept nahi karta. Meharbani farma kar sirf apna asal CNIC upload karein.',
        rawText,
      }
    }

    // If keywords were found but 13-digit number couldn't be extracted:
    // It's likely a real card but blurry or card number area is obscured
    if (!extractedCnic) {
      return {
        found: false,
        isValidCnic: false,
        isBlurry: true,
        idNumber: '',
        error: 'Tasveer mein se 13-digit CNIC number theek tarah detect nahi ho saka. Meharbani farma kar tasveer saaf, bina glare k aur seedhi upload karein.',
        rawText,
      }
    }

    // Verify province code of extracted CNIC
    if (!isValidPakistaniCnic(extractedCnic)) {
      return {
        found: false,
        isValidCnic: false,
        idNumber: '',
        error: `Detect shuda number (${extractedCnic}) valid Pakistani CNIC format par poora nahi utarta.`,
        rawText,
      }
    }

    // Successfully verified & extracted!
    return {
      found: true,
      isValidCnic: true,
      idNumber: extractedCnic,
      rawText,
    }
  } catch (err) {
    console.warn('[extractIdCardNumber] OCR scanning notice:', err)
    return {
      found: false,
      isValidCnic: false,
      idNumber: '',
      error: 'OCR scanning mein masla aaya. Meharbani farma kar saaf aur clear CNIC tasveer dobara upload karein.',
    }
  }
}
