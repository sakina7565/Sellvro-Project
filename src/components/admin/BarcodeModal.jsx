import { useRef } from 'react'
import { X, Printer } from 'lucide-react'

/**
 * Generate standard Code 128 pattern (subset B) for authentic barcode rendering in SVG.
 */
function encodeCode128B(text) {
  const PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
  ]

  const clean = String(text || '').trim() || 'SVRO-00000'
  const values = [104] // Start code B
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32
    values.push(code >= 0 && code <= 95 ? code : 0)
  }

  // Calculate checksum
  let sum = values[0]
  for (let i = 1; i < values.length; i++) {
    sum += values[i] * i
  }
  const checksum = sum % 103
  values.push(checksum)
  values.push(106) // Stop code

  // Convert to pattern modules
  let modules = ''
  values.forEach((v) => {
    const pat = PATTERNS[v] || '212222'
    let isBar = true
    for (let j = 0; j < pat.length; j++) {
      const width = parseInt(pat[j], 10)
      modules += (isBar ? '1' : '0').repeat(width)
      isBar = !isBar
    }
  })

  return modules
}

function BarcodeSvg({ value, height = 80, barWidth = 2.4 }) {
  const modules = encodeCode128B(value)
  const quietZone = 12
  const totalWidth = modules.length * barWidth + quietZone * 2

  const rects = []
  let x = quietZone
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      rects.push(
        <rect
          key={i}
          x={x}
          y={0}
          width={barWidth}
          height={height}
          fill="#000000"
        />
      )
    }
    x += barWidth
  }

  return (
    <div className="flex items-center justify-center w-full">
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="max-w-[280px] sm:max-w-[320px] h-auto"
      >
        {rects}
      </svg>
    </div>
  )
}

function BarcodeModal({ isOpen, onClose, product }) {
  const printAreaRef = useRef(null)

  if (!isOpen || !product) return null

  const barcodeValue = product.barcode || product.sku || 'SVRO-00000'

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=520')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Label - ${product.sku}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin: 0; padding: 24px; color: #0f172a; }
            .label-card { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 28px; max-width: 360px; margin: 0 auto; background: #fff; }
            .title { font-size: 15px; font-weight: 500; margin: 14px 0 6px 0; color: #334155; }
            .sku { font-size: 26px; font-weight: 800; margin: 0; color: #020617; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="label-card">
            ${printAreaRef.current?.innerHTML || ''}
            <div class="title">${product.name || ''}</div>
            <div class="sku">${product.sku || ''}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] sm:max-w-[420px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Picture 1 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-[22px] font-bold text-[#1e293b]">Product Label</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Inner Box with Barcode, Title, Bold SKU, Print Button */}
        <div className="mt-5 rounded-2xl bg-white border border-slate-100/90 p-5 flex flex-col items-center justify-center text-center">
          {/* Barcode lines */}
          <div ref={printAreaRef} className="py-2">
            <BarcodeSvg value={barcodeValue} height={85} barWidth={2.4} />
          </div>

          {/* Product Name */}
          <p className="mt-2 text-sm font-medium text-slate-600 line-clamp-1 max-w-[300px]">
            {product.name}
          </p>

          {/* SKU in large bold font */}
          <h3 className="mt-1 font-bold text-2xl sm:text-3xl text-slate-950 font-sans tracking-wide">
            {product.sku}
          </h3>

          {/* Navy Pill Print Barcode Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#030048] hover:bg-[#020038] px-7 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Print Barcode</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BarcodeModal
