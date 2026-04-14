import { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Customer } from '../types/customer'

interface Props {
  customers: Customer[]
  onSelect: (customer: Customer) => void
  mobile?: boolean
}

export default function CustomerSearch({ customers, onSelect, mobile }: Props) {
  const [query, setQuery] = useState('')
  const [counts, setCounts] = useState<Record<string, { images: number; vehicles: number }>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Load counts for all customers
  useEffect(() => {
    if (customers.length === 0) return
    const loadCounts = async () => {
      const ids = customers.map(c => c.id)
      const [{ data: imgs }, { data: vehs }] = await Promise.all([
        supabase.from('customer_images').select('customer_id').in('customer_id', ids),
        supabase.from('customer_vehicles').select('customer_id').in('customer_id', ids),
      ])
      const map: Record<string, { images: number; vehicles: number }> = {}
      for (const id of ids) map[id] = { images: 0, vehicles: 0 }
      if (imgs) for (const r of imgs) map[r.customer_id] = { ...map[r.customer_id], images: (map[r.customer_id]?.images || 0) + 1 }
      if (vehs) for (const r of vehs) map[r.customer_id] = { ...map[r.customer_id], vehicles: (map[r.customer_id]?.vehicles || 0) + 1 }
      setCounts(map)
    }
    loadCounts()
  }, [customers])

  const results = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 50)
    const q = query.toLowerCase()
    return customers.filter(c =>
      c.firma.toLowerCase().includes(q) ||
      c.navn.toLowerCase().includes(q) ||
      c.kundenummer.includes(q) ||
      c.telefon.includes(q) ||
      c.mobil.includes(q) ||
      c.adresse.toLowerCase().includes(q) ||
      c.by_navn.toLowerCase().includes(q) ||
      c.noter.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [query, customers])

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Søg firma, navn, kundenr, telefon..."
          className={`w-full pl-12 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            mobile ? 'py-4 text-lg' : 'py-3 text-sm'
          }`}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 mb-2 px-1">
        <span className="text-xs text-gray-400">
          {query.trim() ? `${results.length} resultat(er)` : `${results.length} kunder`}
        </span>
        {!query.trim() && <span className="text-xs text-gray-400">Sorteret A-Z</span>}
      </div>

      <div className={`border border-gray-200 rounded-xl overflow-hidden ${mobile ? 'divide-y divide-gray-100' : ''}`}>
        {results.length === 0 ? (
          <p className={`text-center text-gray-400 ${mobile ? 'py-8 text-base' : 'py-6 text-sm'}`}>
            Ingen kunder fundet
          </p>
        ) : (
          results.map((c) => {
            const ct = counts[c.id]
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full text-left hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between border-b border-gray-100 last:border-0 ${
                  mobile ? 'px-4 py-4' : 'px-4 py-3'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-gray-800 truncate ${mobile ? 'text-base' : 'text-sm'}`}>
                    {c.firma || c.navn || 'Ingen navn'}
                  </div>
                  <div className={`text-gray-500 truncate ${mobile ? 'text-sm mt-0.5' : 'text-xs'}`}>
                    {[
                      c.kundenummer && `#${c.kundenummer}`,
                      c.firma && c.navn ? c.navn : null,
                      c.telefon,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {ct && ct.vehicles > 0 && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 ${mobile ? 'text-xs' : 'text-[10px]'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1m0 0V6a1 1 0 011-1h2a1 1 0 011 1v10l-2 1-2-1z" /></svg>
                        {ct.vehicles}
                      </span>
                    )}
                    {ct && ct.images > 0 && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-600 ${mobile ? 'text-xs' : 'text-[10px]'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {ct.images}
                      </span>
                    )}
                  </div>
                  {c.by_navn && (
                    <span className={`text-gray-400 ${mobile ? 'text-sm' : 'text-xs'}`}>{c.by_navn}</span>
                  )}
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
