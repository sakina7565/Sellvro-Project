import { Image as ImageIcon, Plus } from 'lucide-react'

function MainPhotoSlot() {
  return (
    <div className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 sm:h-32 sm:w-32">
      <ImageIcon className="h-7 w-7 text-slate-300" />
      <span className="absolute bottom-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
        Main
      </span>
    </div>
  )
}

function AddPhotoSlot() {
  return (
    <button
      type="button"
      className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary sm:h-24 sm:w-24"
    >
      <Plus className="h-5 w-5" />
      <span className="text-xs font-medium">Add</span>
    </button>
  )
}

function ProductPhotoUpload() {
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <MainPhotoSlot />
        {Array.from({ length: 5 }).map((_, index) => (
          <AddPhotoSlot key={index} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Upload up to 6 photos. First image is the main listing photo. Accepted formats: JPG, PNG,
        WEBP — max 5MB each.
      </p>
    </div>
  )
}

export default ProductPhotoUpload
