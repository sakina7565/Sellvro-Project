import fs from 'fs'

export function getImageDimensionsFromBuffer(buffer) {
  if (!buffer || buffer.length < 24) return null

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    if (buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        type: 'png',
      }
    }
  }

  // GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
      type: 'gif',
    }
  }

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) {
        offset++
        continue
      }
      const marker = buffer[offset + 1]
      // SOF markers: 0xC0 (baseline), 0xC1 (extended), 0xC2 (progressive), 0xC3 (lossless)
      if (
        (marker >= 0xC0 && marker <= 0xC3) ||
        (marker >= 0xC5 && marker <= 0xC7) ||
        (marker >= 0xC9 && marker <= 0xCB) ||
        (marker >= 0xCD && marker <= 0xCF)
      ) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        return { width, height, type: 'jpeg' }
      }
      // Skip variable length markers
      if (marker === 0xD9 || marker === 0xDA) break // EOI or SOS
      if (offset + 4 > buffer.length) break
      const len = buffer.readUInt16BE(offset + 2)
      if (len <= 0) break
      offset += 2 + len
    }
  }

  // WebP
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    const chunkType = buffer.slice(12, 16).toString('ascii')
    if (chunkType === 'VP8 ') {
      if (buffer.length >= 30 && buffer[23] === 0x9D && buffer[24] === 0x01 && buffer[25] === 0x2A) {
        const width = buffer.readUInt16LE(26) & 0x3fff
        const height = buffer.readUInt16LE(28) & 0x3fff
        return { width, height, type: 'webp' }
      }
    } else if (chunkType === 'VP8L') {
      if (buffer.length >= 25 && buffer[20] === 0x2F) {
        const b0 = buffer[21]
        const b1 = buffer[22]
        const b2 = buffer[23]
        const b3 = buffer[24]
        const width = 1 + (((b1 & 0x3F) << 8) | b0)
        const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
        return { width, height, type: 'webp' }
      }
    } else if (chunkType === 'VP8X') {
      if (buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3)
        const height = 1 + buffer.readUIntLE(27, 3)
        return { width, height, type: 'webp' }
      }
    }
  }

  return null
}

export function getImageDimensionsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    const fd = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(65536)
    const bytesRead = fs.readSync(fd, buffer, 0, 65536, 0)
    fs.closeSync(fd)
    if (bytesRead < 24) return null
    return getImageDimensionsFromBuffer(buffer.slice(0, bytesRead))
  } catch (err) {
    console.warn('[imageDimensions] Error reading file:', err.message)
    return null
  }
}

export default getImageDimensionsFromFile
