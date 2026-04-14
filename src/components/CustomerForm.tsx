import { useState, useRef } from 'react'
import { emptyCustomer } from '../types/customer'
import { scanFile } from '../lib/scanParser'

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
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanRawText, setScanRawText] = useState('')
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const scanInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

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

  const handleDirectScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanProgress(0)
    setScanStatus('idle')
    setScanRawText('')
    setScanPreview(null)

    try {
      const { parsed, rawText, preview } = await scanFile(file, setScanProgress)
      setScanRawText(rawText)
      if (preview) setScanPreview(preview)

      if (Object.keys(parsed).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(parsed).filter(([_, v]) => v !== '' && v !== undefined)
          ),
        }))
        setScanStatus('success')
      } else {
        setScanStatus('error')
      }
    } catch {
      setScanStatus('error')
    }

    setScanning(false)
    if (scanInput.current) scanInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
    setTimeout(() => setScanStatus('idle'), 4000)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">

      {/* Inline scanner bar */}
      <div className="col-span-full mb-1">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>

          <span className="text-sm font-medium text-purple-800">Scan direkte:</span>

          {/* Camera / scanner button */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Kamera
            <input
              ref={cameraInput}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleDirectScan}
              className="hidden"
              disabled={scanning}
            />
          </label>

          {/* File upload button */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm font-medium cursor-pointer hover:bg-purple-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Vælg fil / PDF
            <input
              ref={scanInput}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleDirectScan}
              className="hidden"
              disabled={scanning}
            />
          </label>

          {/* Status */}
          {scanning && (
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <div className="flex-1 bg-purple-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
              </div>
              <span className="text-xs text-purple-600 font-medium whitespace-nowrap">{scanProgress}%</span>
            </div>
          )}

          {scanStatus === 'success' && !scanning && (
            <span className="text-sm text-green-700 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Data udfyldt!
            </span>
          )}
          {scanStatus === 'error' && !scanning && (
            <span className="text-sm text-red-600 font-medium">Ingen data fundet</span>
          )}
        </div>

        {/* Scan preview + raw text (collapsible) */}
        {scanPreview && !scanning && (
          <details className="mt-2 border border-gray-200 rounded-lg">
            <summary className="px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50">
              Vis scannet resultat
            </summary>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-200">
              <img src={scanPreview} alt="Scan" className="w-full rounded border border-gray-200" />
              {scanRawText && (
                <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap max-h-48 overflow-auto">
                  {scanRawText}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>

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
