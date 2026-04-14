import { useState, useRef } from 'react'
import { emptyCustomer } from '../types/customer'
import { scanFile } from '../lib/scanParser'

type FormData = typeof emptyCustomer

interface Props {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (val: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )
}

export default function CustomerForm({ formData, setFormData }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanRawText, setScanRawText] = useState('')
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const scanInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  const set = (field: keyof FormData) => (val: string) =>
    setFormData(prev => ({ ...prev, [field]: val }))

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
    <div>
      {/* Inline scanner bar */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <svg className="w-5 h-5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium text-purple-800">Scan direkte:</span>

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

      {/* Two-column layout matching the customer card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
        {/* Left column - Kundeoplysninger */}
        <div className="space-y-3">
          <Field label="Kundenummer" value={formData.kundenummer} onChange={set('kundenummer')} />
          <Field label="Firma" value={formData.firma} onChange={set('firma')} />
          <Field label="Navn" value={formData.navn} onChange={set('navn')} />
          <Field label="Adresse" value={formData.adresse} onChange={set('adresse')} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Postnummer" value={formData.postnummer} onChange={set('postnummer')} />
            <div className="col-span-2">
              <Field label="By" value={formData.by_navn} onChange={set('by_navn')} />
            </div>
          </div>
        </div>

        {/* Right column - Telefon */}
        <div className="space-y-3">
          <Field label="Telefonnummer" value={formData.telefonnummer} onChange={set('telefonnummer')} type="tel" />
          <Field label="Telefonnummer 2" value={formData.telefonnummer2} onChange={set('telefonnummer2')} type="tel" />
          <Field label="Fax" value={formData.fax} onChange={set('fax')} type="tel" />
          <Field label="Mobiltelefon" value={formData.mobiltelefon} onChange={set('mobiltelefon')} type="tel" />
          <Field label="Mobiltelefon 2" value={formData.mobiltelefon2} onChange={set('mobiltelefon2')} type="tel" />
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-gray-200" />

      {/* Noter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Noter</label>
        <textarea
          value={formData.noter}
          onChange={e => set('noter')(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      </div>
    </div>
  )
}
