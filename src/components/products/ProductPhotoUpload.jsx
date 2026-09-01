import { useEffect, useRef } from 'react'
import { Image as ImageIcon, Plus, X } from 'lucide-react'

const MAX_PHOTOS = 6
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

function ProductPhotoUpload({ photos = [], onChange, onError }) {
  const inputRefs = useRef([])

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo?.preview?.startsWith('blob:')) URL.revokeObjectURL(photo.preview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPicker = (index) => {
    inputRefs.current[index]?.click()
  }

  const applyFile = (index, file) => {
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      onError?.('Only JPG, PNG and WEBP images are allowed.')
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.('Each photo must be 5MB or smaller.')
      return
    }

    const next = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)
    if (next[index]?.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(next[index].preview)
    }
    next[index] = { file, preview: URL.createObjectURL(file) }
    onChange?.(next)
    onError?.('')
  }

  const handleRemove = (index) => {
    const next = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)
    if (next[index]?.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(next[index].preview)
    }
    next[index] = null
    onChange?.(next)
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        {slots.map((photo, index) => {
          const isMain = index === 0
          const sizeClass = isMain ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-20 w-20 sm:h-24 sm:w-24'

          return (
            <div key={index} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) applyFile(index, file)
                }}
              />

              {photo ? (
                <div
                  className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${sizeClass}`}
                >
                  <img
                    src={photo.preview}
                    alt={isMain ? 'Main product' : `Product ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {isMain && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openPicker(index)}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary ${sizeClass}`}
                >
                  {isMain ? (
                    <>
                      <ImageIcon className="h-7 w-7 text-slate-300" />
                      <span className="absolute bottom-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                        Main
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">Add photo</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span className="text-xs font-medium">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Click Add to choose photos from your computer. First image is the main listing photo.
        Accepted formats: JPG, PNG, WEBP — max 5MB each.
      </p>
    </div>
  )
}

export default ProductPhotoUpload
