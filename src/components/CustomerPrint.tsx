import jsPDF from 'jspdf'
import { Customer, CustomerImage, CustomerVehicle, FLOW_FIELDS } from '../types/customer'
import { supabase } from '../lib/supabase'

const RED: [number, number, number] = [220, 38, 38]
const DARK: [number, number, number] = [30, 30, 30]
const GRAY: [number, number, number] = [120, 120, 120]
const LIGHT_RED: [number, number, number] = [254, 242, 242]
const WHITE: [number, number, number] = [255, 255, 255]

async function buildPDF(customer: Customer, images: CustomerImage[]): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 15 // margin
  const CW = W - M * 2
  let y = 0

  // ─── HELPERS ───

  const drawRedBar = (yPos: number, height: number) => {
    doc.setFillColor(...RED)
    doc.rect(0, yPos, W, height, 'F')
  }

  const drawLightBar = (yPos: number, height: number) => {
    doc.setFillColor(...LIGHT_RED)
    doc.rect(M, yPos, CW, height, 'F')
  }

  const sectionTitle = (title: string) => {
    y += 3
    doc.setFillColor(...RED)
    doc.rect(M, y, CW, 8, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(title, M + 4, y + 5.5)
    y += 12
  }

  const fieldLabel = (label: string, x: number, yPos: number) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label, x, yPos)
  }

  const fieldValue = (value: string, x: number, yPos: number) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(value || '–', x, yPos)
  }

  const fieldPair = (label: string, value: string, x: number) => {
    fieldLabel(label, x, y)
    fieldValue(value, x, y + 4)
    return 9
  }

  const fieldRow = (l1: string, v1: string, l2: string, v2: string) => {
    fieldPair(l1, v1, M + 2)
    fieldPair(l2, v2, M + CW / 2 + 2)
    y += 10
  }

  const thinLine = () => {
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y)
    y += 2
  }

  const checkNewPage = (needed: number) => {
    if (y + needed > 275) { doc.addPage(); y = 15; return true }
    return false
  }

  // ─── PAGE 1: HEADER ───

  // Red header bar
  drawRedBar(0, 28)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('AUMA', M + 2, 14)
  doc.setFont('helvetica', 'normal')
  doc.text('FLOW', M + 32, 14)

  // Customer name in header
  doc.setFontSize(10)
  doc.text(customer.firma || customer.navn || '', M + 2, 23)

  // Date on the right
  const now = new Date()
  doc.setFontSize(8)
  doc.text(now.toLocaleDateString('da-DK'), W - M - 2, 23, { align: 'right' })

  y = 35

  // ─── KUNDEOPLYSNINGER ───

  sectionTitle('KUNDEOPLYSNINGER')

  // Light background for customer info
  drawLightBar(y - 2, 42)

  fieldRow('Kundenummer', customer.kundenummer, 'Telefon', customer.telefon)
  fieldRow('Firma', customer.firma, 'Mobil', customer.mobil)
  fieldRow('Navn', customer.navn, '', '')
  fieldRow('Adresse', customer.adresse, 'Postnr / By', `${customer.postnummer} ${customer.by_navn}`.trim())

  if (customer.noter) {
    y += 2
    fieldLabel('Noter', M + 2, y)
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const noteLines = doc.splitTextToSize(customer.noter, CW - 4)
    doc.text(noteLines, M + 2, y)
    y += noteLines.length * 3.5 + 4
  }

  // ─── FLOW VEHICLES ───

  const { data: vehicles } = await supabase
    .from('customer_vehicles')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: true })

  if (vehicles && vehicles.length > 0) {
    for (const v of vehicles as CustomerVehicle[]) {
      checkNewPage(60)

      y += 4
      sectionTitle(`FLOW: ${v.emne || 'Bil'}`)

      const leftFields = FLOW_FIELDS.filter(f => f.side === 'left')
      const rightFields = FLOW_FIELDS.filter(f => f.side === 'right')
      const maxRows = Math.max(leftFields.length, rightFields.length)

      // Alternating row backgrounds
      for (let i = 0; i < maxRows; i++) {
        checkNewPage(10)

        if (i % 2 === 0) {
          drawLightBar(y - 2, 9)
        }

        const lf = leftFields[i]
        const rf = rightFields[i]

        if (lf) {
          const val = (v as any)[lf.key] || ''
          fieldLabel(lf.label, M + 2, y)
          fieldValue(val, M + 2, y + 4)
        }
        if (rf) {
          const val = (v as any)[rf.key] || ''
          fieldLabel(rf.label, M + CW / 2 + 2, y)
          fieldValue(val, M + CW / 2 + 2, y + 4)
        }

        y += 9
      }

      // Bemærkninger
      if (v.bemaerkninger) {
        checkNewPage(20)
        y += 2
        thinLine()
        fieldLabel('Bemærkninger', M + 2, y)
        y += 4
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        const bemLines = doc.splitTextToSize(v.bemaerkninger, CW - 4)
        doc.text(bemLines, M + 2, y)
        y += bemLines.length * 3.5 + 4
      }
    }
  }

  // ─── PAGE 2+: BILLEDER (always on new page) ───

  if (images.length > 0) {
    doc.addPage()
    y = 0

    // Red header bar for images page
    drawRedBar(0, 20)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('BILLEDER', M + 2, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`${customer.firma || customer.navn || ''} – ${images.length} billede(r)`, W - M - 2, 13, { align: 'right' })

    y = 28

    const imgW = 55
    const imgH = 42
    const gap = 5
    const cols = 3
    let col = 0

    for (const img of images) {
      try {
        if (y + imgH + 10 > 280) {
          doc.addPage()
          y = 15
          col = 0
        }

        const response = await fetch(img.image_url)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        const x = M + col * (imgW + gap)

        // Image border
        doc.setDrawColor(...RED)
        doc.setLineWidth(0.4)
        doc.rect(x, y, imgW, imgH)

        doc.addImage(dataUrl, 'JPEG', x + 0.5, y + 0.5, imgW - 1, imgH - 1)

        // Image name below
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRAY)
        const name = img.image_name.length > 25 ? img.image_name.slice(0, 22) + '...' : img.image_name
        doc.text(name, x + imgW / 2, y + imgH + 3.5, { align: 'center' })

        col++
        if (col >= cols) {
          col = 0
          y += imgH + 8
        }
      } catch { /* skip */ }
    }
  }

  // ─── FOOTER on all pages ───

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    // Red bottom line
    doc.setDrawColor(...RED)
    doc.setLineWidth(0.5)
    doc.line(M, 287, W - M, 287)
    // Footer text
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('AUMA FLOW', M, 291)
    doc.text(`Side ${i} / ${totalPages}`, W / 2, 291, { align: 'center' })
    doc.text(now.toLocaleDateString('da-DK') + ' ' + now.toLocaleTimeString('da-DK'), W - M, 291, { align: 'right' })
  }

  return doc
}

/** Print directly to printer */
export async function printCustomer(customer: Customer, images: CustomerImage[]) {
  const doc = await buildPDF(customer, images)
  const blobUrl = doc.output('bloburl')
  const printWindow = window.open(blobUrl as unknown as string, '_blank')
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print()
    })
  }
}

/** Save as PDF file */
export async function savePDF(customer: Customer, images: CustomerImage[]) {
  const doc = await buildPDF(customer, images)
  doc.save(`auma-flow-${(customer.firma || customer.navn || 'kunde').replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
