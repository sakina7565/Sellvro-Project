import { useEffect, useState, useMemo } from 'react'
import {
  X,
  TrendingUp,
  Globe,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import { adminApi, productApi, mediaUrl, getErrorMessage } from '../../lib/api.js'

function ProductResearchModal({ isOpen, onClose, onSuccess, product, panel = 'admin' }) {
  const [globalSearchVolume, setGlobalSearchVolume] = useState('')
  const [globalMonthlySales, setGlobalMonthlySales] = useState('')
  const [usMarketAverageSales, setUsMarketAverageSales] = useState('')
  const [keywords, setKeywords] = useState(['', '', '', '', ''])
  const [rankingPriority, setRankingPriority] = useState('standard')
  const [adminEvaluationNotes, setAdminEvaluationNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (product) {
      setGlobalSearchVolume(
        product.globalSearchVolume !== undefined && product.globalSearchVolume !== null
          ? String(product.globalSearchVolume)
          : '0',
      )
      setGlobalMonthlySales(
        product.globalMonthlySales !== undefined && product.globalMonthlySales !== null
          ? String(product.globalMonthlySales)
          : '0',
      )
      setUsMarketAverageSales(
        product.usMarketAverageSales !== undefined && product.usMarketAverageSales !== null
          ? String(product.usMarketAverageSales)
          : '0',
      )

      // Keywords: ensure 5 slots
      const existingKw = Array.isArray(product.productKeywords) ? product.productKeywords : []
      const slots = ['', '', '', '', '']
      existingKw.slice(0, 5).forEach((kw, i) => {
        slots[i] = kw || ''
      })
      setKeywords(slots)

      setRankingPriority(product.rankingPriority || 'standard')
      setAdminEvaluationNotes(product.adminEvaluationNotes || '')
      setError('')
      setSuccessMsg('')
    }
  }, [product])

  // Calculated Preview Score
  const previewScore = useMemo(() => {
    const priorityWeights = {
      high: 10000000,
      medium: 5000000,
      low: 1000000,
      standard: 0,
    }
    const pWeight = priorityWeights[rankingPriority] || 0
    const sales = Math.max(0, parseInt(globalMonthlySales, 10) || 0) * 100
    const usSales = Math.max(0, parseInt(usMarketAverageSales, 10) || 0) * 150
    const search = Math.max(0, parseInt(globalSearchVolume, 10) || 0) * 1
    const kwCount = keywords.filter((k) => k.trim()).length * 500
    return pWeight + sales + usSales + search + kwCount
  }, [rankingPriority, globalMonthlySales, usMarketAverageSales, globalSearchVolume, keywords])

  if (!isOpen || !product) return null

  const handleKeywordChange = (index, value) => {
    setKeywords((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    setLoading(true)
    try {
      const cleanKeywords = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 5)
      const payload = {
        globalSearchVolume: Math.max(0, parseInt(globalSearchVolume, 10) || 0),
        globalMonthlySales: Math.max(0, parseInt(globalMonthlySales, 10) || 0),
        usMarketAverageSales: Math.max(0, parseInt(usMarketAverageSales, 10) || 0),
        productKeywords: cleanKeywords,
        rankingPriority,
        adminEvaluationNotes: adminEvaluationNotes.trim(),
      }

      const res =
        panel === 'supplier'
          ? await productApi.update(product.id || product._id, payload)
          : await adminApi.updateProductResearch(product.id || product._id, payload)
      setSuccessMsg('Product research & evaluation saved successfully!')
      if (res?.product) {
        onSuccess?.(res.product)
      } else {
        onSuccess?.({ ...product, ...payload, rankingScore: previewScore })
      }
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save product research.'))
    } finally {
      setLoading(false)
    }
  }

  const prodImg = product.image ? mediaUrl(product.image) : (Array.isArray(product.images) && product.images[0] ? mediaUrl(product.images[0]) : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Product Research &amp; Evaluation
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  Landing Page Ranking
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Enter market metrics and 5 keywords to calculate product ranking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Snapshot Bar */}
        <div className="flex items-center gap-3 bg-slate-50/80 px-6 py-3 border-b border-slate-100 shrink-0">
          {prodImg ? (
            <img
              src={prodImg}
              alt={product.name}
              className="h-11 w-11 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 font-mono text-xs font-bold text-slate-600">
              SKU
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs text-slate-900 truncate">{product.name}</h4>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span className="font-mono font-bold text-indigo-700">SKU: {product.sku}</span>
              <span>&bull;</span>
              <span>Category: <strong>{product.category || 'General'}</strong></span>
              <span>&bull;</span>
              <span>Price: <strong>${Number(product.price || 0).toFixed(2)}</strong></span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Calculated Score</span>
            <span className="text-sm font-black text-indigo-700 font-mono">{previewScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: The 3 Numerical Market Metrics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Market Research Metrics
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field 1: Global Search Volume */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Global Search Volume
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Total estimated search volume across platforms</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={globalSearchVolume}
                    onChange={(e) => setGlobalSearchVolume(e.target.value)}
                    placeholder="e.g. 85000"
                    className="font-mono text-xs font-bold pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    / mo
                  </span>
                </div>
              </div>

              {/* Field 2: Global Monthly Sales */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Global Monthly Sales
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Estimated units sold globally across markets</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={globalMonthlySales}
                    onChange={(e) => setGlobalMonthlySales(e.target.value)}
                    placeholder="e.g. 3200"
                    className="font-mono text-xs font-bold pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    units
                  </span>
                </div>
              </div>

              {/* Field 3: US Market Average Sales */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  US Market Average Sales
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Average monthly sales benchmark in the US</p>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={usMarketAverageSales}
                    onChange={(e) => setUsMarketAverageSales(e.target.value)}
                    placeholder="e.g. 1500"
                    className="font-mono text-xs font-bold pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Five Product Keywords */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Five Product Keywords
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Used for SEO ranking &amp; landing page search discovery
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs text-slate-600 mb-3">
                Enter up to 5 relevant keywords discovered during research for this item:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-800">
                      {idx + 1}
                    </span>
                    <Input
                      value={keywords[idx] || ''}
                      onChange={(e) => handleKeywordChange(idx, e.target.value)}
                      placeholder={`Keyword ${idx + 1} (e.g. leather belt)`}
                      className="bg-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span>Score: <strong className="font-mono text-indigo-700">{previewScore.toLocaleString()}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={loading}
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5"
            >
              Save Research Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductResearchModal
