import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'

interface Props {
  onScanComplete: (data: Record<string, string>) => void
}

function parseScannedText(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const fullText = lines.join(' ')

  // Email
  const emailMatch = fullText.match(/[\w.-]+@[\w.-]+\.\w{2,}/i)
  if (emailMatch) result.email = emailMatch[0]

  // Phone numbers
  const phoneMatches = fullText.match(/(?:\+45\s?)?(?:\d{2}\s?){4}/g)
  if (phoneMatches) {
    if (phoneMatches[0]) result.telefon = phoneMatches[0].trim()
    if (phoneMatches[1]) result.mobil = phoneMatches[1].trim()
  }

  // CVR
  const cvrMatch = fullText.match(/(?:CVR|cvr|DK)[:\s-]*(\d{8})/i)
  if (cvrMatch) result.cvr_nummer = cvrMatch[1]

  // Postnummer + By (Danish zip codes are 4 digits)
  const zipMatch = fullText.match(/\b(\d{4})\s+([A-ZÆØÅa-zæøå]+(?:\s[A-ZÆØÅa-zæøå]+)?)\b/)
  if (zipMatch) {
    const zip = parseInt(zipMatch[1])
    if (zip >= 1000 && zip <= 9999) {
      result.postnummer = zipMatch[1]
      result.by_navn = zipMatch[2]
    }
  }

  // Website / Company hints
  const webMatch = fullText.match(/(?:www\.[\w.-]+\.\w{2,}|[\w-]+\.dk)/i)

  // Try to detect company name (usually first line or line before address)
  if (lines.length > 0) {
    // First non-email, non-phone line is often the company name
    for (const line of lines) {
      if (line.match(/[@\d]{4,}/) || line.match(/(?:tlf|tel|mob|fax|mail|www)/i)) continue
      if (line.length > 2 && line.length < 60) {
        result.firma_navn = line
        break
      }
    }
  }

  // Try to detect contact person (line that looks like a name)
  const namePattern = /^[A-ZÆØÅ][a-zæøå]+\s[A-ZÆØÅ][a-zæøå]+$/
  for (const line of lines) {
    if (line !== result.firma_navn && namePattern.test(line)) {
      result.kontaktperson = line
      break
    }
  }

  // Address (line containing a number followed by text, typical Danish addresses)
  const addrMatch = lines.find(l =>
    /\b\d+[A-Za-z]?\b/.test(l) &&
    !/[@]/.test(l) &&
    !/(?:CVR|tlf|tel|mob|fax)/i.test(l) &&
    l !== result.firma_navn &&
    l.length > 5
  )
  if (addrMatch) {
    result.adresse = addrMatch
      .replace(/\b\d{4}\s+[A-ZÆØÅa-zæøå]+.*$/, '')
      .trim()
  }

  // If we found a web domain, use it as a hint for company name
  if (!result.firma_navn && webMatch) {
    const domain = webMatch[0].replace(/^www\./, '').replace(/\.dk$/, '')
    result.firma_navn = domain.charAt(0).toUpperCase() + domain.slice(1)
  }

  return result
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

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setScanning(true)
    setProgress(0)

    try {
      const result = await Tesseract.recognize(file, 'dan+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const text = result.data.text
      setRawText(text)
      const parsed = parseScannedText(text)
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

      {/* Progress bar */}
      {scanning && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Scanner dokument...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview + raw text */}
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
