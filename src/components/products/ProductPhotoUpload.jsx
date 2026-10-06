import { useEffect, useRef } from 'react'
import { Image as ImageIcon, Video as VideoIcon, Plus, X, Film } from 'lucide-react'

const MAX_PHOTOS = 10
const MAX_BYTES = 100 * 1024 * 1024 // 100MB
const ACCEPTED_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ACCEPTED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-matroska']
const ACCEPTED = [...ACCEPTED_IMAGES, ...ACCEPTED_VIDEOS]

function isVideo(file) {
  if (!file) return false
  if (file.type && file.type.startsWith('video/')) return true
  if (typeof file.name === 'string') {
    return /\.(mp4|webm|mov|ogg|mkv)$/i.test(file.name)
  }
  return false
}

function ProductPhotoUpload({ photos = [], onChange, onError, minPhotos = 1 }) {
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

    const isValidType =
      ACCEPTED.includes(file.type) ||
      /\.(jpe?g|png|webp|gif|mp4|webm|mov|ogg|mkv)$/i.test(file.name)

    if (!isValidType) {
      onError?.('Only JPG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos are allowed.')
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.('Each image or video file must be 100MB or smaller.')
      return
    }

    const next = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)
    if (next[index]?.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(next[index].preview)
    }
    next[index] = { file, preview: URL.createObjectURL(file), isVideo: isVideo(file) }
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
  const uploadedCount = photos.filter(Boolean).length
  const isRequirementMet = uploadedCount >= minPhotos

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-teal-600 shrink-0" />
          <span className="font-semibold text-teal-950">
            Upload up to 10 Product Images &amp; Videos (At least {minPhotos} photos required)
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-xs ${
            isRequirementMet
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-200 text-amber-900'
          }`}
        >
          {uploadedCount} / {MAX_PHOTOS} uploaded {isRequirementMet ? '✓' : `(min ${minPhotos})`}
        </span>
      </div>

      {/* Grid of 10 Upload Slots */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 md:grid-cols-5">
        {slots.map((photo, index) => {
          const isMain = index === 0
          const isRequired = index < minPhotos
          const isVid = photo?.isVideo || (photo?.file && isVideo(photo.file))

          return (
            <div key={index} className="relative aspect-square">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/ogg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) applyFile(index, file)
                }}
              />

              {photo ? (
                <div className="group relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-xs">
                  {isVid ? (
                    <video
                      src={photo.preview}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      autoPlay
                      loop
                    />
                  ) : (
                    <img
                      src={photo.preview}
                      alt={isMain ? 'Main product' : `Media ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 pointer-events-none">
                    {isMain && (
                      <span className="rounded-md bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        Main {isRequired ? '*' : ''}
                      </span>
                    )}
                    {isVid && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-teal-300 shadow-xs">
                        <VideoIcon className="h-2.5 w-2.5" /> Video
                      </span>
                    )}
                    {!isMain && isRequired && !isVid && (
                      <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Req *
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-transform hover:scale-110 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove media"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[8px] font-semibold text-white">
                    #{index + 1}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openPicker(index)}
                  className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-all ${
                    isRequired && !isRequirementMet
                      ? 'border-amber-300 bg-amber-50/40 text-amber-700 hover:border-amber-400 hover:bg-amber-100/50'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-600'
                  }`}
                >
                  {isMain ? (
                    <>
                      <ImageIcon className="h-6 w-6 text-teal-500" />
                      <span className="rounded-md bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Main Image *
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">Slot #1</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-0.5 text-slate-400">
                        <Plus className="h-4 w-4" />
                        <Film className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        {isRequired ? 'Photo/Video *' : 'Photo/Video'}
                      </span>
                      <span className="text-[9px] text-slate-400">Slot #{index + 1}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        📌 Click any slot to upload images or product video demonstrations.{' '}
        <strong>First slot is the main catalog photo</strong>. You can upload up to <strong>10 files</strong> (Images: JPG, PNG, WEBP, GIF &bull; Videos: MP4, WEBM, MOV &bull; Max 100MB per file).
      </p>
    </div>
  )
}

export default ProductPhotoUpload
