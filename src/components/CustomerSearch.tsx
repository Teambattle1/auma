import { useState, useMemo, useRef, useEffect } from 'react'
import { Customer } from '../types/customer'

interface Props {
  customers: Customer[]
  onSelect: (customer: Customer) => void
  mobile?: boolean
}

export default function CustomerSearch({ customers, onSelect, mobile }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus search field
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show all customers sorted when no query (useful for browsing)
      return customers.slice(0, 50)
    }
    const q = query.toLowerCase()
    return customers.filter(c =>
      c.firma.toLowerCase().includes(q) ||
      c.navn.toLowerCase().includes(q) ||
      c.kundenummer.includes(q) ||
      c.telefon.includes(q) ||
      c.mobil.includes(q) ||
      c.adresse.toLowerCase().includes(q) ||
      c.by_navn.toLowerCase().includes(q) ||
      c.ordrenr.includes(q) ||
      c.emne.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [query, customers])

  return (
    <div>
      {/* Search input - large and touch-friendly */}
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

      {/* Result count */}
      <div className="flex items-center justify-between mt-3 mb-2 px-1">
        <span className="text-xs text-gray-400">
          {query.trim() ? `${results.length} resultat(er)` : `${results.length} kunder`}
        </span>
        {!query.trim() && (
          <span className="text-xs text-gray-400">Sorteret A-Z</span>
        )}
      </div>

      {/* Results list - large touch targets */}
      <div className={`border border-gray-200 rounded-xl overflow-hidden ${mobile ? 'divide-y divide-gray-100' : ''}`}>
        {results.length === 0 ? (
          <p className={`text-center text-gray-400 ${mobile ? 'py-8 text-base' : 'py-6 text-sm'}`}>
            Ingen kunder fundet
          </p>
        ) : (
          results.map((c) => (
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
                {c.by_navn && (
                  <span className={`text-gray-400 ${mobile ? 'text-sm' : 'text-xs'}`}>{c.by_navn}</span>
                )}
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
