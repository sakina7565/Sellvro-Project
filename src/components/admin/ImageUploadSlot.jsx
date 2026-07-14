import { Image as ImageIcon, Pencil } from 'lucide-react'

/**
 * Small square upload placeholder used for the repeated product
 * image slots on the Add Product form.
 */
function ImageUploadSlot({ label = 'Product Image' }) {
  return (
    <div className="relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-center text-[10px] leading-tight text-slate-400">
      <ImageIcon className="h-5 w-5 text-slate-300" />
      <span>{label}</span>
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-soft">
        <Pencil className="h-3 w-3" />
      </span>
    </div>
  )
}

export default ImageUploadSlot
