import { useState, useMemo } from 'react'
import { Customer } from '../types/customer'

interface Props {
  customers: Customer[]
  onSelect: (customer: Customer) => void
}

export default function CustomerSearch({ customers, onSelect }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return customers.filter(c =>
      c.firma_navn.toLowerCase().includes(q) ||
      c.kontaktperson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telefon.includes(q) ||
      c.mobil.includes(q) ||
      c.cvr_nummer.includes(q) ||
      c.adresse.toLowerCase().includes(q) ||
      c.by_navn.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [query, customers])

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Søg på firmanavn, kontaktperson, email, telefon, CVR..."
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        autoFocus
      />

      {query.trim() && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Ingen resultater fundet</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {results.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    i < results.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-800">{c.firma_navn}</div>
                    <div className="text-xs text-gray-500">
                      {[c.kontaktperson, c.email, c.telefon].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{c.by_navn}</div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">{results.length} resultat(er)</p>
        </div>
      )}
    </div>
  )
}
