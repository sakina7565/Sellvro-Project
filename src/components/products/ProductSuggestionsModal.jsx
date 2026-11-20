import { useEffect, useState, useMemo } from 'react'
import {
  X,
  Sparkles,
  Link2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Package,
  Layers,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import ProductImage from '../ui/ProductImage.jsx'
import { productApi, getErrorMessage } from '../../lib/api.js'

export default function ProductSuggestionsModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  allProducts = [],
}) {
  const [sisterSkus, setSisterSkus] = useState([])
  const [variationType, setVariationType] = useState('Color')
  const [manualSku, setManualSku] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (product) {
      setSisterSkus(Array.isArray(product.sisterSkus) ? [...product.sisterSkus] : [])
      setVariationType(product.sisterVariationType || 'Color')
      setManualSku('')
      setError('')
      setSuccess('')
    }
  }, [product])

  // Suggested products from the catalog (same category, brand or similar words, excluding current product & already linked SKUs)
  const suggestedProducts = useMemo(() => {
    if (!product || !allProducts?.length) return []
    const currentSku = String(product.sku || '').toUpperCase()
    const currentCat = String(product.category || '').toLowerCase()
    const currentBrand = String(product.brand || '').toLowerCase()
    const nameWords = String(product.name || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)

    return allProducts
      .filter((p) => {
        const pSku = String(p.sku || '').toUpperCase()
        if (pSku === currentSku) return false
        if (sisterSkus.map((s) => s.toUpperCase()).includes(pSku)) return false

        // Match category, brand or title word
        const pCat = String(p.category || '').toLowerCase()
        const pBrand = String(p.brand || '').toLowerCase()
        const pName = String(p.name || '').toLowerCase()

        const catMatch = currentCat && pCat === currentCat
        const brandMatch = currentBrand && pBrand === currentBrand
        const nameMatch = nameWords.some((word) => pName.includes(word))

        return catMatch || brandMatch || nameMatch
      })
      .slice(0, 8)
  }, [product, allProducts, sisterSkus])

  if (!isOpen || !product) return null

  const handleAddSku = (skuToAdd) => {
    const clean = String(skuToAdd || '').trim().toUpperCase()
    if (!clean) return
    const currentSku = String(product.sku || '').toUpperCase()
    if (clean === currentSku) {
      setError(`Cannot add self-SKU (${currentSku}) as a sister SKU.`)
      return
    }
    if (sisterSkus.includes(clean)) {
      setError(`SKU ${clean} is already linked.`)
      return
    }
    setSisterSkus((prev) => [...prev, clean])
    setManualSku('')
    setError('')
  }

  const handleRemoveSku = (skuToRemove) => {
    setSisterSkus((prev) => prev.filter((s) => s !== skuToRemove))
    setError('')
  }

  const handleSave = async () => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        sisterSkus,
        sisterVariationType: variationType,
      }
      const res = await productApi.update(product.id || product._id, payload)
      setSuccess('Sister SKU product suggestions updated successfully!')
      if (res?.product) {
        onSuccess?.(res.product)
      } else {
        onSuccess?.({ ...product, ...payload })
      }
      setTimeout(() => {
        onClose()
      }, 750)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update sister SKUs.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Lookup details for a linked SKU
  const getProductForSku = (sku) => {
    return allProducts.find((p) => String(p.sku || '').toUpperCase() === String(sku).toUpperCase())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-amber-50/80 via-white to-sky-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Product Suggestions &amp; Sister SKUs
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Cross-Promotion
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Link related products so buyers see &quot;Same Product Available in Different Colors / Variations&quot;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Product Card */}
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <ProductImage product={product} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900">{product.sku}</span>
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {product.category || 'General'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 truncate mt-0.5">{product.name}</p>
              <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                ${Number(product.price || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Variation Type Selection */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Variation Type for Suggestions
            </label>
            <p className="text-[11px] text-slate-500">
              Choose how buyers will see the connected variants (e.g. &quot;Different Colors&quot; or &quot;Different Sizes&quot;)
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Color', 'Size', 'Style', 'Material', 'Design'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVariationType(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    variationType === type
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Linked Sister SKUs */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-slate-900">
                  Linked Sister SKUs ({sisterSkus.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Shown to users on product page
              </span>
            </div>

            {sisterSkus.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No sister SKUs linked yet. Add related products below to cross-promote.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sisterSkus.map((sku) => {
                  const peer = getProductForSku(sku)
                  return (
                    <div
                      key={sku}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {peer && (
                          <div className="h-8 w-8 shrink-0 rounded overflow-hidden border border-slate-200 bg-white">
                            <ProductImage product={peer} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-800">{sku}</span>
                          {peer && (
                            <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                              {peer.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSku(sku)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Remove Sister SKU"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Manual SKU Entry */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="Type SKU to link (e.g. SVRO-1029)..."
                value={manualSku}
                onChange={(e) => setManualSku(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSku(manualSku)
                  }
                }}
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddSku(manualSku)}
                className="h-9 px-3 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add SKU
              </Button>
            </div>
          </div>

          {/* Catalog Smart Suggestions */}
          {suggestedProducts.length > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-950">
                  Smart Product Suggestions from Your Catalog
                </span>
              </div>
              <p className="text-[11px] text-amber-900/70">
                These products share matching category or keywords and can be linked as variations:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestedProducts.map((p) => (
                  <div
                    key={p.id || p._id || p.sku}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded overflow-hidden border border-slate-200 bg-slate-50">
                        <ProductImage product={p} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-800">{p.sku}</span>
                        <p className="text-[11px] text-slate-600 truncate max-w-[140px] font-medium">
                          {p.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddSku(p.sku)}
                      className="h-7 px-2 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5 shrink-0">
          <p className="text-xs text-slate-500">
            {sisterSkus.length} sister SKU{sisterSkus.length === 1 ? '' : 's'} linked
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={submitting}
              className="bg-primary hover:bg-primary-600 text-white font-bold"
            >
              {submitting ? 'Saving...' : 'Save Suggestions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
