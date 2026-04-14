import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export function parseScannedText(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const fullText = lines.join(' ')

  // --- Label-based parsing (structured documents like customer cards) ---
  // Maps label patterns to our field names
  const labelMap: [RegExp, string][] = [
    // Kundeoplysninger
    [/kunde(?:nummer|nr\.?)\s*[:.]?\s*/i, 'kundenummer'],
    [/firma\s*[:.]?\s*/i, 'firma'],
    [/^navn\s*[:.]?\s*/i, 'navn'],
    [/adresse\s*[:.]?\s*/i, 'adresse'],
    [/post(?:nummer|nr\.?)\s*[:.]?\s*/i, 'postnummer'],
    [/(?:^|\s)by\s*[:.]?\s*/i, 'by_navn'],
    [/telefonnummer\s*[:.]?\s*/i, 'telefonnummer'],
    [/telefonnr\.?\s*[:.]?\s*/i, 'telefonnummer'],
    [/tlf\.?\s*[:.]?\s*/i, 'telefonnummer'],
    [/fax\s*[:.]?\s*/i, 'fax'],
    [/mobil(?:telefon|nr\.?)?\s*[:.]?\s*/i, 'mobiltelefon'],
    // Flow
    [/ordrenr\.?\s*[:.]?\s*/i, 'ordrenr'],
    [/emne\s*[:.]?\s*/i, 'emne'],
    [/(?:^|\s)id\s*[:.]?\s*/i, 'flow_id'],
    [/f(?:ø|oe?)rerhus\s*[:.]?\s*/i, 'foererhus'],
    [/sk(?:æ|ae?)rme\s*[:.]?\s*/i, 'skaerme'],
    [/kofanger\s*[:.]?\s*/i, 'kofanger'],
    [/solsk(?:æ|ae?)rm\s*[:.]?\s*/i, 'solskaerm'],
    [/stige\s*[:.]?\s*/i, 'stige'],
    [/tagbagage\s*[:.]?\s*/i, 'tagbagage'],
    [/luftfilter\s*[:.]?\s*/i, 'luftfilter'],
    [/spoiler\s*[:.]?\s*/i, 'spoiler'],
    [/striber\/?dek\.?\s*[:.]?\s*/i, 'striber_dek'],
    [/skrifttype\s*[:.]?\s*/i, 'skrifttype'],
    [/undervogn\s*[:.]?\s*/i, 'undervogn'],
    [/(?:^|\s)hjul\s*[:.]?\s*/i, 'hjul'],
    [/kant\s*(?:p(?:å|aa?)\s*)?hjul\s*[:.]?\s*/i, 'kant_paa_hjul'],
    [/v(?:æ|ae?)rkt(?:ø|oe?)jsks?\.?\s*[:.]?\s*/i, 'vaerktoejsks'],
    [/tank\s*[:.]?\s*/i, 'tank'],
    [/kran\s*[:.]?\s*/i, 'kran'],
    [/(?:^|\s)lift\s*[:.]?\s*/i, 'lift'],
    [/lad\s*opbyg\.?\s*[:.]?\s*/i, 'lad_opbyg'],
    [/fjelder\s*[:.]?\s*/i, 'fjelder'],
    [/kasse\s*[:.]?\s*/i, 'kasse'],
    [/folienr\.?\s*[:.]?\s*/i, 'folienr'],
    [/bem(?:æ|ae?)rkninger\s*[:.]?\s*/i, 'bemaerkninger'],
  ]

  // Try to extract labeled fields from each line
  let foundLabels = false
  for (const line of lines) {
    for (const [pattern, field] of labelMap) {
      const match = line.match(pattern)
      if (match) {
        const value = line.slice(match.index! + match[0].length).trim()
        if (value && value !== '-') {
          // Handle second telefonnummer/mobiltelefon
          if (field === 'telefonnummer' && result.telefonnummer) {
            result.telefonnummer2 = value
          } else if (field === 'mobiltelefon' && result.mobiltelefon) {
            result.mobiltelefon2 = value
          } else {
            result[field] = value
          }
          foundLabels = true
        }
        break
      }
    }
  }

  // Also check for "Postnummer: 2980  By: Kokkedal" style combined lines
  for (const line of lines) {
    const comboMatch = line.match(/post(?:nummer|nr\.?)\s*[:.]?\s*(\d{4})\s+(?:by\s*[:.]?\s*)?([A-ZÆØÅa-zæøå]+(?:\s[A-ZÆØÅa-zæøå]+)?)/i)
    if (comboMatch) {
      result.postnummer = comboMatch[1]
      result.by_navn = comboMatch[2]
      foundLabels = true
    }
  }

  // Bemærkninger: collect multiple lines after the label
  const bemIdx = lines.findIndex(l => /bem(?:æ|ae?)rkninger\s*[:.]?\s*/i.test(l))
  if (bemIdx >= 0) {
    const firstLine = lines[bemIdx].replace(/bem(?:æ|ae?)rkninger\s*[:.]?\s*/i, '').trim()
    const bemLines = firstLine ? [firstLine] : []
    for (let i = bemIdx + 1; i < lines.length; i++) {
      const isLabel = labelMap.some(([p]) => p.test(lines[i]))
      if (isLabel) break
      bemLines.push(lines[i])
    }
    if (bemLines.length > 0) {
      result.bemaerkninger = bemLines.join('\n')
      foundLabels = true
    }
  }

  // If we found labeled fields, return - structured document
  if (foundLabels) return result

  // --- Fallback: free-form parsing (business cards, invoices etc.) ---

  // Phone numbers
  const phoneMatches = fullText.match(/(?:\+45\s?)?(?:\d{2}\s?){4}/g)
  if (phoneMatches) {
    if (phoneMatches[0]) result.telefonnummer = phoneMatches[0].trim()
    if (phoneMatches[1]) result.mobiltelefon = phoneMatches[1].trim()
  }

  // Kundenummer
  const kundeMatch = fullText.match(/(?:kunde(?:nummer|nr)?|kd\.?\s*nr)[:\s]*(\d+)/i)
  if (kundeMatch) result.kundenummer = kundeMatch[1]

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

  // Try to detect company/firma name
  if (lines.length > 0) {
    for (const line of lines) {
      if (line.match(/[@\d]{4,}/) || line.match(/(?:tlf|tel|mob|fax|mail|www)/i)) continue
      if (line.length > 2 && line.length < 60) {
        result.firma = line
        break
      }
    }
  }

  // Try to detect name (line that looks like a person name)
  const namePattern = /^[A-ZÆØÅ][a-zæøå]+\s[A-ZÆØÅ][a-zæøå]+$/
  for (const line of lines) {
    if (line !== result.firma && namePattern.test(line)) {
      result.navn = line
      break
    }
  }

  // Address
  const addrMatch = lines.find(l =>
    /\b\d+[A-Za-z]?\b/.test(l) &&
    !/[@]/.test(l) &&
    !/(?:CVR|tlf|tel|mob|fax)/i.test(l) &&
    l !== result.firma &&
    l.length > 5
  )
  if (addrMatch) {
    result.adresse = addrMatch
      .replace(/\b\d{4}\s+[A-ZÆØÅa-zæøå]+.*$/, '')
      .trim()
  }

  // Web domain as firma hint
  if (!result.firma && webMatch) {
    const domain = webMatch[0].replace(/^www\./, '').replace(/\.dk$/, '')
    result.firma = domain.charAt(0).toUpperCase() + domain.slice(1)
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

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise

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
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
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
