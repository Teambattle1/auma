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
    setTimeout(() => setScanStatus('idle'), 4000)
  }

  return (
    <div>
      {/* Upload scan bar */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <label className="btn-red inline-flex items-center gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {scanning ? 'Scanner...' : 'Upload'}
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
                <div className="bg-red-600 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
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
          <details className="mt-2 border border-red-200 rounded-lg">
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
          <Field label="Telefon" value={formData.telefon} onChange={set('telefon')} type="tel" />
          <Field label="Mobil" value={formData.mobil} onChange={set('mobil')} type="tel" />
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
