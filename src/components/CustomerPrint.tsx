import jsPDF from 'jspdf'
import { Customer, CustomerImage, CustomerVehicle, FLOW_FIELDS } from '../types/customer'
import { supabase } from '../lib/supabase'

async function buildPDF(customer: Customer, images: CustomerImage[]): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addTitle = (text: string) => {
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y); y += 10
  }
  const addSection = (title: string, color: [number, number, number] = [37, 99, 235]) => {
    y += 4; doc.setDrawColor(...color); doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentWidth, y); y += 6
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
    doc.text(title, margin, y); doc.setTextColor(0, 0, 0); y += 6
  }
  const addField = (label: string, value: string | number, inline = false) => {
    if (!value && value !== 0) return
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100)
    const x = inline ? margin + contentWidth / 2 : margin
    doc.text(label + ':', x, y); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
    doc.text(String(value), x + doc.getTextWidth(label + ': ') + 1, y)
    if (!inline) y += 5
  }
  const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => {
    addField(l1, v1); if (v2) { y -= 5; addField(l2, v2, true) }
  }

  addTitle('AUMA FLOW')
  y += 2

  addSection('KUNDEOPLYSNINGER')
  addFieldRow('Kundenummer', customer.kundenummer, 'Telefon', customer.telefon)
  addFieldRow('Firma', customer.firma, 'Mobil', customer.mobil)
  addField('Navn', customer.navn)
  addField('Adresse', customer.adresse)
  addField('Postnr / By', `${customer.postnummer} ${customer.by_navn}`.trim())

  const { data: vehicles } = await supabase
    .from('customer_vehicles')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: true })

  if (vehicles && vehicles.length > 0) {
    for (const v of vehicles as CustomerVehicle[]) {
      addSection(`FLOW: ${v.emne || 'Bil'}`, [220, 38, 38])
      for (const f of FLOW_FIELDS) {
        const val = (v as any)[f.key]
        if (val) addField(f.label, val)
      }
      if (v.bemaerkninger) {
        y += 2; doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100,100,100)
        doc.text('Bemærkninger:', margin, y); y += 4
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0)
        const lines = doc.splitTextToSize(v.bemaerkninger, contentWidth)
        doc.text(lines, margin, y); y += lines.length * 4
      }
      if (y > 250) { doc.addPage(); y = margin }
    }
  }

  if (customer.noter) {
    addSection('NOTER')
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(customer.noter, contentWidth)
    doc.text(noteLines, margin, y); y += noteLines.length * 4
  }

  if (images.length > 0) {
    addSection('BILLEDER')
    y += 2; const imgSize = 40; const gap = 5
    const cols = Math.floor(contentWidth / (imgSize + gap)); let col = 0
    for (const img of images) {
      try {
        if (y + imgSize > 280) { doc.addPage(); y = margin }
        const response = await fetch(img.image_url); const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob)
        })
        doc.addImage(dataUrl, 'JPEG', margin + col * (imgSize + gap), y, imgSize, imgSize)
        col++; if (col >= cols) { col = 0; y += imgSize + gap }
      } catch { /* skip */ }
    }
  }

  const now = new Date()
  doc.setFontSize(7); doc.setTextColor(150,150,150)
  doc.text(`Udskrevet: ${now.toLocaleDateString('da-DK')} ${now.toLocaleTimeString('da-DK')}`, margin, 290)

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
  doc.save(`kunde-${(customer.firma || customer.navn || 'kunde').replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
