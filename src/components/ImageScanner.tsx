import { useState, useRef } from 'react'
import { scanImage } from '../lib/scanParser'

interface Props {
  onScanComplete: (data: Record<string, string>) => void
}

export default function ImageScanner({ onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setScanning(true)
    setProgress(0)

    try {
      const { parsed, rawText: text } = await scanImage(file, setProgress)
      setRawText(text)
      onScanComplete(parsed)
    } catch (err: any) {
      alert('Scanning fejl: ' + err.message)
    }

    setScanning(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Upload et billede af et visitkort, faktura eller dokument. Systemet scanner teksten og udfylder kundefelterne automatisk.
      </p>

      <label className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {scanning ? 'Scanner...' : 'Vælg billede til scanning'}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={handleScan}
          className="hidden"
          disabled={scanning}
        />
      </label>

      {scanning && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Scanner dokument...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Scannet billede:</p>
            <img src={preview} alt="Scanned" className="w-full rounded-lg border border-gray-200" />
          </div>
          {rawText && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Fundet tekst:</p>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap max-h-64 overflow-auto">
                {rawText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
