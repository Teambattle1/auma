import { useState } from 'react'
import { emptyCustomer } from '../types/customer'

type FormData = typeof emptyCustomer

interface Props {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

async function lookupCVR(cvr: string): Promise<Partial<FormData> | null> {
  const clean = cvr.replace(/\D/g, '')
  if (clean.length !== 8) return null

  const res = await fetch(`https://cvrapi.dk/api?search=${clean}&country=dk`, {
    headers: { 'User-Agent': 'AUMA Kundekartotek' },
  })
  if (!res.ok) return null

  const data = await res.json()
  if (!data.name) return null

  return {
    firma_navn: data.name || '',
    cvr_nummer: String(data.vat || clean),
    adresse: data.address || '',
    postnummer: String(data.zipcode || ''),
    by_navn: data.city || '',
    telefon: data.phone ? String(data.phone) : '',
    email: data.email || '',
  }
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  wide = false,
}: {
  label: string
  value: string | number
  onChange: (val: string) => void
  type?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="col-span-full mt-4 mb-2">
      <div className="flex items-center gap-3">
        <div className="h-0.5 bg-blue-600 flex-grow" />
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">
          {title}
        </span>
        <div className="h-0.5 bg-blue-600 flex-grow" />
      </div>
    </div>
  )
}

export default function CustomerForm({ formData, setFormData }: Props) {
  const [cvrLoading, setCvrLoading] = useState(false)
  const [cvrStatus, setCvrStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const set = (field: keyof FormData) => (val: string) =>
    setFormData(prev => ({ ...prev, [field]: field === 'kredit_limit' ? Number(val) || 0 : val }))

  const handleCvrLookup = async () => {
    if (!formData.cvr_nummer.trim()) return
    setCvrLoading(true)
    setCvrStatus('idle')
    try {
      const result = await lookupCVR(formData.cvr_nummer)
      if (result) {
        setFormData(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(result).filter(([_, v]) => v !== '' && v !== undefined)
          ),
        }))
        setCvrStatus('success')
      } else {
        setCvrStatus('error')
      }
    } catch {
      setCvrStatus('error')
    }
    setCvrLoading(false)
    setTimeout(() => setCvrStatus('idle'), 3000)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {/* Firmadata */}
      <SectionDivider title="Firmadata" />
      <Field label="Firmanavn *" value={formData.firma_navn} onChange={set('firma_navn')} />

      {/* CVR med opslag-knap */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">CVR-nummer</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.cvr_nummer}
            onChange={e => set('cvr_nummer')(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCvrLookup() } }}
            placeholder="12345678"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleCvrLookup}
            disabled={cvrLoading || !formData.cvr_nummer.trim()}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              cvrStatus === 'success'
                ? 'bg-green-100 text-green-700'
                : cvrStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'
            }`}
          >
            {cvrLoading ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Søger...
              </span>
            ) : cvrStatus === 'success' ? (
              'Fundet!'
            ) : cvrStatus === 'error' ? (
              'Ikke fundet'
            ) : (
              'CVR Opslag'
            )}
          </button>
        </div>
      </div>
      <Field label="Adresse" value={formData.adresse} onChange={set('adresse')} wide />
      <Field label="Postnummer" value={formData.postnummer} onChange={set('postnummer')} />
      <Field label="By" value={formData.by_navn} onChange={set('by_navn')} />
      <Field label="Land" value={formData.land} onChange={set('land')} />

      {/* Kontaktperson */}
      <SectionDivider title="Kontaktperson" />
      <Field label="Kontaktperson" value={formData.kontaktperson} onChange={set('kontaktperson')} />
      <Field label="Titel" value={formData.titel} onChange={set('titel')} />
      <Field label="Telefon" value={formData.telefon} onChange={set('telefon')} type="tel" />
      <Field label="Mobil" value={formData.mobil} onChange={set('mobil')} type="tel" />
      <Field label="Email" value={formData.email} onChange={set('email')} type="email" wide />

      {/* Noter */}
      <SectionDivider title="Noter" />
      <Field label="Noter" value={formData.noter} onChange={set('noter')} type="textarea" wide />
    </div>
  )
}
