import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

// All known labels mapped to field names. Order matters for matching priority.
// Words that look like labels but should be ignored during parsing
const IGNORE_WORDS = /kundebilleder|kundebilled/i

const LABEL_DEFS: [string, string][] = [
  // Kundeoplysninger
  ['Kundenummer', 'kundenummer'],
  ['Kundenr', 'kundenummer'],
  ['Firma', 'firma'],
  ['Adresse', 'adresse'],
  ['Postnummer', 'postnummer'],
  ['Postnr', 'postnummer'],
  ['By', 'by_navn'],
  ['Telefonnummer', 'telefon'],
  ['Telefonnr', 'telefon'],
  ['Telefon', 'telefon'],
  ['Tlf', 'telefon'],
  ['Mobiltelefon', 'mobil'],
  ['Mobilnr', 'mobil'],
  ['Mobil', 'mobil'],
  // Flow
  ['Ordrenr', 'ordrenr'],
  ['Emne', 'emne'],
  ['ID', 'flow_id'],
  ['Førerhus', 'foererhus'],
  ['Foererhus', 'foererhus'],
  ['Skærme', 'skaerme'],
  ['Skaerme', 'skaerme'],
  ['Kofanger', 'kofanger'],
  ['Solskærm', 'solskaerm'],
  ['Solskaerm', 'solskaerm'],
  ['Stige', 'stige'],
  ['Tagbagage', 'tagbagage'],
  ['Luftfilter', 'luftfilter'],
  ['Spoiler', 'spoiler'],
  ['Striber/dek', 'striber_dek'],
  ['Striber', 'striber_dek'],
  ['Skrifttype', 'skrifttype'],
  ['Undervogn', 'undervogn'],
  ['Kant på hjul', 'kant_paa_hjul'],
  ['Kant paa hjul', 'kant_paa_hjul'],
  ['Hjul', 'hjul'],
  ['Værktøjsks', 'vaerktoejsks'],
  ['Vaerktoejsks', 'vaerktoejsks'],
  ['Tank', 'tank'],
  ['Kran', 'kran'],
  ['Lift', 'lift'],
  ['Lad opbyg', 'lad_opbyg'],
  ['Fjelder', 'fjelder'],
  ['Kasse', 'kasse'],
  ['Folienr', 'folienr'],
  ['Bemærkninger', 'bemaerkninger'],
  ['Bemaerkninger', 'bemaerkninger'],
]

// Build a master regex that finds ALL label positions in a string.
// Sorted by length descending so longer labels match first (e.g. "Kant på hjul" before "Hjul").
const sortedLabels = [...LABEL_DEFS].sort((a, b) => b[0].length - a[0].length)
const labelAlt = sortedLabels.map(([l]) => l.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|')
const multiLabelRe = new RegExp(`(${labelAlt})\\s*[:.;]?\\s*`, 'gi')

export function parseScannedText(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Build a lookup: lowercase label -> field name
  const labelToField = new Map<string, string>()
  for (const [label, field] of LABEL_DEFS) {
    labelToField.set(label.toLowerCase(), field)
  }

  // Step 1: Find Bemærkninger section first, so we can exclude those lines from label parsing
  const bemIdx = lines.findIndex(l => /bem(?:æ|ae?)rkninger\s*[:.]?\s*/i.test(l))
  const bemLineIndices = new Set<number>()
  let foundLabels = false

  if (bemIdx >= 0) {
    const firstLine = lines[bemIdx].replace(/.*?bem(?:æ|ae?)rkninger\s*[:.]?\s*/i, '').trim()
    const bemLines = firstLine ? [firstLine] : []
    bemLineIndices.add(bemIdx)
    for (let i = bemIdx + 1; i < lines.length; i++) {
      // Stop if this line starts with a known label (but not inside bemærkninger content)
      multiLabelRe.lastIndex = 0
      const hasLabel = multiLabelRe.test(lines[i])
      // Only break if the label is at the START of the line (not just a word in the middle)
      multiLabelRe.lastIndex = 0
      const startsWithLabel = hasLabel && multiLabelRe.exec(lines[i])?.index === 0
      multiLabelRe.lastIndex = 0
      if (startsWithLabel && !/bem(?:æ|ae?)rkninger/i.test(lines[i])) break
      bemLines.push(lines[i])
      bemLineIndices.add(i)
    }
    if (bemLines.length > 0) {
      result.bemaerkninger = bemLines.join('\n')
      foundLabels = true
    }
  }

  // Step 2: Process all lines EXCEPT bemærkninger content lines
  const dupCount: Record<string, number> = {}

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    // Skip lines that are part of Bemærkninger content (not the label line itself)
    if (bemLineIndices.has(lineIdx) && lineIdx !== bemIdx) continue

    const line = lines[lineIdx]

    // Find all label matches in this line with their positions
    const matches: { label: string; field: string; start: number; end: number }[] = []
    multiLabelRe.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = multiLabelRe.exec(line)) !== null) {
      const matchedLabel = m[1].toLowerCase()
      const field = labelToField.get(matchedLabel)
      if (field) {
        matches.push({
          label: m[1],
          field,
          start: m.index,
          end: m.index + m[0].length,
        })
      }
    }

    if (matches.length === 0) continue

    // Extract value for each label: from label end to next label start (or end of line)
    for (let i = 0; i < matches.length; i++) {
      const valueEnd = i + 1 < matches.length ? matches[i + 1].start : line.length
      let value = line.slice(matches[i].end, valueEnd).trim()

      // Remove leading colons/dots
      value = value.replace(/^[:.;]+\s*/, '')
      // Remove ignored words (e.g. "Kundebilleder")
      value = value.replace(IGNORE_WORDS, '').trim()

      if (!value || value === '-') continue

      const field = matches[i].field

      // Clean numeric-only fields
      if (field === 'kundenummer') {
        value = value.replace(/\D.*$/, '').trim() // only leading digits
      }
      if (field === 'postnummer') {
        const digits = value.match(/\d{4}/)
        value = digits ? digits[0] : value.replace(/\D/g, '').slice(0, 4)
      }

      // Skip duplicate telefon/mobil
      dupCount[field] = (dupCount[field] || 0) + 1
      if ((field === 'telefon' || field === 'mobil') && dupCount[field] > 1) {
        // skip
      } else if (field !== 'bemaerkninger') {
        // Don't overwrite bemærkninger from label parsing (already collected above)
        result[field] = value
      }
      foundLabels = true
    }
  }

  // Special handling for "Navn:" - only accept if followed by a person name (not "døre 65/45" etc.)
  for (const line of lines) {
    if (bemLineIndices.has(lines.indexOf(line))) continue
    const navnMatch = line.match(/^Navn\s*[:.]?\s+(.+)/i)
    if (navnMatch) {
      const val = navnMatch[1].trim()
      // Only accept as person name if it's not "-" and looks like a name (letters, no numbers)
      if (val && val !== '-' && /^[A-ZÆØÅa-zæøå\s.]+$/.test(val) && val.length > 1) {
        result.navn = val
        foundLabels = true
      }
      break // Only match first occurrence
    }
  }

  if (foundLabels) return result

  // --- Fallback: free-form parsing (business cards, invoices etc.) ---
  const fullText = lines.join(' ')

  // Phone numbers
  const phoneMatches = fullText.match(/(?:\+45\s?)?(?:\d{2}\s?){4}/g)
  if (phoneMatches) {
    if (phoneMatches[0]) result.telefon = phoneMatches[0].trim()
    if (phoneMatches[1]) result.mobil = phoneMatches[1].trim()
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
 * Extract images from a PDF. Two strategies:
 * 1. Try operator list for embedded image objects
 * 2. Fallback: render page and crop the photo region (bottom portion)
 *    by scanning for non-white pixel blocks
 */
async function extractPdfImages(file: File): Promise<File[]> {
  const images: File[] = []
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)

      // Strategy 1: try operator list
      let foundViaOps = false
      try {
        const ops = await page.getOperatorList()
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (ops.fnArray[i] === 85) {
            const imgName = ops.argsArray[i][0]
            try {
              const imgObj: any = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('timeout')), 2000);
                (page as any).objs.get(imgName, (obj: any) => {
                  clearTimeout(timeout)
                  if (obj) resolve(obj); else reject(new Error('No image'))
                })
              })
              if (!imgObj?.width || !imgObj?.height) continue
              if (imgObj.width < 100 || imgObj.height < 100) continue

              const canvas = document.createElement('canvas')
              canvas.width = imgObj.width
              canvas.height = imgObj.height
              const ctx = canvas.getContext('2d')!
              const data = imgObj.data
              if (data && data.length > 0) {
                const imgData = ctx.createImageData(imgObj.width, imgObj.height)
                if (data.length === imgObj.width * imgObj.height * 4) {
                  imgData.data.set(data)
                } else if (data.length === imgObj.width * imgObj.height * 3) {
                  for (let j = 0, k = 0; j < data.length; j += 3, k += 4) {
                    imgData.data[k] = data[j]; imgData.data[k+1] = data[j+1]
                    imgData.data[k+2] = data[j+2]; imgData.data[k+3] = 255
                  }
                } else continue
                ctx.putImageData(imgData, 0, 0)
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
                if (blob && blob.size > 10000) {
                  images.push(new File([blob], `pdf-billede-${p}-${i}.png`, { type: 'image/png' }))
                  foundViaOps = true
                }
              }
            } catch { /* skip individual image */ }
          }
        }
      } catch { /* ops failed */ }

      // Strategy 2: if no images found via ops, render page and crop photo area
      if (!foundViaOps) {
        try {
          const scale = 2.0
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise

          // Scan from bottom up to find where the photo starts
          // Photos have colorful pixels vs white/text areas
          const w = canvas.width
          const h = canvas.height
          const pixels = ctx.getImageData(0, 0, w, h).data

          // Find the top edge of the photo by scanning rows from bottom
          // A "photo row" has many colored (non-white, non-near-white) pixels
          let photoTop = h
          const threshold = 0.15 // 15% of pixels must be colorful
          for (let row = h - 1; row > h * 0.3; row--) {
            let colorful = 0
            // Sample every 4th pixel for speed
            for (let x = 0; x < w; x += 4) {
              const idx = (row * w + x) * 4
              const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2]
              // Not white/near-white and not pure black text
              if (r < 230 || g < 230 || b < 230) {
                if (!(r < 50 && g < 50 && b < 50)) {
                  colorful++
                }
              }
            }
            const ratio = colorful / (w / 4)
            if (ratio >= threshold) {
              photoTop = row
            } else if (photoTop < h - 20) {
              // We found the top edge - stop scanning
              break
            }
          }

          // Only extract if we found a substantial photo area (at least 15% of page height)
          const photoHeight = h - photoTop
          if (photoHeight > h * 0.15 && photoTop < h - 50) {
            // Add some padding above
            const cropTop = Math.max(0, photoTop - 10)
            const cropHeight = h - cropTop

            const cropCanvas = document.createElement('canvas')
            cropCanvas.width = w
            cropCanvas.height = cropHeight
            const cropCtx = cropCanvas.getContext('2d')!
            cropCtx.drawImage(canvas, 0, cropTop, w, cropHeight, 0, 0, w, cropHeight)

            const blob = await new Promise<Blob | null>(r => cropCanvas.toBlob(r, 'image/png'))
            if (blob && blob.size > 10000) {
              images.push(new File([blob], `pdf-foto-side-${p}.png`, { type: 'image/png' }))
            }
          }
        } catch { /* render crop failed */ }
      }
    }
  } catch { /* extraction failed */ }
  return images
}

/**
 * Scan a file (image or PDF) and return parsed customer data + extracted images.
 */
export async function scanFile(
  file: File,
  onProgress: (p: number) => void
): Promise<{ parsed: Record<string, string>; rawText: string; preview: string | null; extractedImages: File[] }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  let rawText: string
  let preview: string | null = null
  let extractedImages: File[] = []

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
      // Preview generation failed
    }
    // Extract embedded images from the PDF
    extractedImages = await extractPdfImages(file)
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
    preview = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target?.result as string)
      reader.readAsDataURL(file)
    })
  }

  const parsed = parseScannedText(rawText)
  return { parsed, rawText, preview, extractedImages }
}

// Keep backwards-compatible alias
export const scanImage = async (
  file: File,
  onProgress: (p: number) => void
): Promise<{ parsed: Record<string, string>; rawText: string }> => {
  const result = await scanFile(file, onProgress)
  return { parsed: result.parsed, rawText: result.rawText }
}
