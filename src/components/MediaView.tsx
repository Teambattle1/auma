import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Customer, CustomerImage } from '../types/customer'

interface Props {
  customers: Customer[]
  onClose: () => void
}

interface ImageWithCustomer extends CustomerImage {
  customer_firma: string
  customer_navn: string
}

export default function MediaView({ customers, onClose }: Props) {
  const [images, setImages] = useState<ImageWithCustomer[]>([])
  const [query, setQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [sliderIndex, setSliderIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAllImages = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customer_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      const customerMap = new Map(customers.map(c => [c.id, c]))
      const enriched: ImageWithCustomer[] = data.map(img => {
        const c = customerMap.get(img.customer_id)
        return {
          ...img,
          customer_firma: c?.firma || '',
          customer_navn: c?.navn || '',
        }
      })
      setImages(enriched)
    }
    setLoading(false)
  }, [customers])

  useEffect(() => { loadAllImages() }, [loadAllImages])

  // Filter
  const filtered = images.filter(img => {
    if (selectedCustomer !== 'all' && img.customer_id !== selectedCustomer) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      return img.image_name.toLowerCase().includes(q) ||
        img.customer_firma.toLowerCase().includes(q) ||
        img.customer_navn.toLowerCase().includes(q)
    }
    return true
  })

  // Unique customers that have images
  const customerIds = [...new Set(images.map(i => i.customer_id))]
  const customersWithImages = customers.filter(c => customerIds.includes(c.id))

  // Slideshow
  const openSlider = (i: number) => setSliderIndex(i)
  const closeSlider = () => setSliderIndex(null)
  const prev = () => {
    if (sliderIndex === null) return
    setSliderIndex(sliderIndex <= 0 ? filtered.length - 1 : sliderIndex - 1)
  }
  const next = () => {
    if (sliderIndex === null) return
    setSliderIndex(sliderIndex >= filtered.length - 1 ? 0 : sliderIndex + 1)
  }

  // Keyboard nav
  useEffect(() => {
    if (sliderIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSlider()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const handlePrintImage = () => {
    if (sliderIndex === null || !filtered[sliderIndex]) return
    const img = filtered[sliderIndex]
    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.write(`
        <html><head><title>${img.image_name}</title>
        <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
        img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>
        <body><img src="${img.image_url}" /><script>window.onload=()=>window.print()</script></body></html>
      `)
      printWin.document.close()
    }
  }

  // Auto slideshow
  const [autoPlay, setAutoPlay] = useState(false)
  useEffect(() => {
    if (!autoPlay || sliderIndex === null) return
    const timer = setInterval(next, 3000)
    return () => clearInterval(timer)
  })

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold flex-1">MEDIE BIBLIOTEK</h2>
        <span className="text-sm opacity-80">{filtered.length} billeder</span>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-2 shrink-0">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Søg billeder..."
          className="flex-1 min-w-[150px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        />
        <select
          value={selectedCustomer}
          onChange={e => setSelectedCustomer(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Alle kunder</option>
          {customersWithImages.map(c => (
            <option key={c.id} value={c.id}>{c.firma || c.navn}</option>
          ))}
        </select>
        <button
          onClick={() => { if (filtered.length > 0) { setSliderIndex(0); setAutoPlay(true) } }}
          className="btn-red flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Slideshow
        </button>
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Henter billeder...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Ingen billeder fundet</p>
        ) : (
          <>
            {/* Group by customer */}
            {selectedCustomer === 'all' ? (
              customersWithImages
                .filter(c => filtered.some(img => img.customer_id === c.id))
                .map(c => {
                  const custImages = filtered.filter(img => img.customer_id === c.id)
                  return (
                    <div key={c.id} className="mb-6">
                      <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        {c.firma || c.navn} ({custImages.length})
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                        {custImages.map(img => {
                          const globalIdx = filtered.indexOf(img)
                          return (
                            <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-red-200 bg-white cursor-pointer hover:border-red-400 transition-colors"
                              onClick={() => openSlider(globalIdx)}
                            >
                              <img src={img.image_url} alt={img.image_name} className="w-full h-full object-contain p-1" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {filtered.map((img, i) => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-red-200 bg-white cursor-pointer hover:border-red-400 transition-colors"
                    onClick={() => openSlider(i)}
                  >
                    <img src={img.image_url} alt={img.image_name} className="w-full h-full object-contain p-1" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Slideshow / Preview popup */}
      {sliderIndex !== null && filtered[sliderIndex] && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={closeSlider}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" onClick={e => e.stopPropagation()}>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{filtered[sliderIndex].image_name}</div>
              <div className="text-xs opacity-60">{filtered[sliderIndex].customer_firma || filtered[sliderIndex].customer_navn}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className="text-sm opacity-60">{sliderIndex + 1} / {filtered.length}</span>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${autoPlay ? 'bg-red-600' : 'hover:bg-white/10'}`}
              >
                {autoPlay ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <button onClick={handlePrintImage} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              </button>
              <button onClick={closeSlider} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-lg">
                &times;
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-14 pb-4 relative" onClick={e => e.stopPropagation()}>
            {filtered.length > 1 && (
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl">
                &lsaquo;
              </button>
            )}
            <img
              src={filtered[sliderIndex].image_url}
              alt={filtered[sliderIndex].image_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {filtered.length > 1 && (
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl">
                &rsaquo;
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {filtered.length > 1 && (
            <div className="px-4 pb-3 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="flex gap-1.5 justify-center overflow-x-auto py-1">
                {filtered.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => { setSliderIndex(i); setAutoPlay(false) }}
                    className={`w-12 h-12 rounded overflow-hidden border-2 shrink-0 transition-all ${
                      i === sliderIndex ? 'border-red-500 scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
