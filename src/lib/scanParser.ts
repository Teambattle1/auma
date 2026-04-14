import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export function parseScannedText(text: string): Record<string, string> {
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
    l !== result.firma_namn &&
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

/**
 * Extract text from a PDF file. First tries native text extraction,
 * falls back to OCR on rendered pages if no text found.
 */
async function extractPdfText(
  file: File,
  onProgress: (p: number) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages

  // First: try native text extraction (digital PDFs)
  let nativeText = ''
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
    nativeText += pageText + '\n'
    onProgress(Math.round((i / totalPages) * 30))
  }

  // If we got meaningful text from the PDF directly, use that
  if (nativeText.trim().length > 20) {
    onProgress(100)
    return nativeText
  }

  // Fallback: render pages to canvas and OCR them (scanned PDFs)
  let ocrText = ''
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    )
    const imgFile = new File([blob], `page-${i}.png`, { type: 'image/png' })

    const result = await Tesseract.recognize(imgFile, 'dan+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pageProgress = 30 + ((i - 1) / totalPages) * 70 + (m.progress / totalPages) * 70
          onProgress(Math.round(Math.min(pageProgress, 99)))
        }
      },
    })
    ocrText += result.data.text + '\n'
  }

  onProgress(100)
  return ocrText
}

/**
 * Scan a file (image or PDF) and return parsed customer data.
 */
export async function scanFile(
  file: File,
  onProgress: (p: number) => void
): Promise<{ parsed: Record<string, string>; rawText: string; preview: string | null }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  let rawText: string
  let preview: string | null = null

  if (isPdf) {
    rawText = await extractPdfText(file, onProgress)
    // Generate preview from first page
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise
      preview = canvas.toDataURL('image/png')
    } catch {
      // Preview generation failed, not critical
    }
  } else {
    // Image file - use Tesseract OCR
    const result = await Tesseract.recognize(file, 'dan+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100))
        }
      },
    })
    rawText = result.data.text
    // Preview from image
    preview = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target?.result as string)
      reader.readAsDataURL(file)
    })
  }

  const parsed = parseScannedText(rawText)
  return { parsed, rawText, preview }
}

// Keep backwards-compatible alias
export const scanImage = async (
  file: File,
  onProgress: (p: number) => void
): Promise<{ parsed: Record<string, string>; rawText: string }> => {
  const result = await scanFile(file, onProgress)
  return { parsed: result.parsed, rawText: result.rawText }
}
