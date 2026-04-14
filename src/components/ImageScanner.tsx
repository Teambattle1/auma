import { useState, useRef } from 'react'
import { scanFile } from '../lib/scanParser'

interface Props {
  onScanComplete: (data: Record<string, string>, extractedImages?: File[]) => void
}

export default function ImageScanner({ onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [imgCount, setImgCount] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setProgress(0)
    setPreview(null)
    setRawText('')
    setImgCount(0)

    try {
      const { parsed, rawText: text, preview: prev, extractedImages } = await scanFile(file, setProgress)
      setRawText(text)
      if (prev) setPreview(prev)
      setImgCount(extractedImages.length)
      onScanComplete(parsed, extractedImages)
    } catch (err: any) {
      alert('Scanning fejl: ' + err.message)
    }

    setScanning(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Upload et billede eller PDF. Systemet scanner teksten og udfylder kundeoplysninger og Flow-felter automatisk. Billeder i dokumentet uploades til Kundebilleder.
      </p>

      <label className="btn-red inline-flex items-center gap-2 px-5 py-3 cursor-pointer">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {scanning ? 'Scanner...' : 'Upload til scan'}
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
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
            <div className="bg-red-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {preview && !scanning && (
        <div className="mt-4">
          {imgCount > 0 && (
            <p className="text-sm text-green-700 font-medium mb-3">
              {imgCount} billede(r) fundet og tilføjet til Kundebilleder
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Scannet dokument:</p>
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
        </div>
      )}
    </div>
  )
}
