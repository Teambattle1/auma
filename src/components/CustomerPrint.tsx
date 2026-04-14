import jsPDF from 'jspdf'
import { Customer, CustomerImage } from '../types/customer'

export async function generatePDF(customer: Customer, images: CustomerImage[]) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addTitle = (text: string) => {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 10
  }

  const addSection = (title: string) => {
    y += 4
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentWidth, y)
    y += 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text(title, margin, y)
    doc.setTextColor(0, 0, 0)
    y += 6
  }

  const addRedSection = (title: string) => {
    y += 4
    doc.setDrawColor(220, 38, 38)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentWidth, y)
    y += 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text(title, margin, y)
    doc.setTextColor(0, 0, 0)
    y += 6
  }

  const addField = (label: string, value: string | number, inline = false) => {
    if (!value && value !== 0) return
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    const xStart = inline ? margin + contentWidth / 2 : margin
    doc.text(label + ':', xStart, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const labelWidth = doc.getTextWidth(label + ': ')
    doc.text(String(value), xStart + labelWidth + 1, y)
    if (!inline) y += 5
  }

  const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => {
    addField(l1, v1)
    if (v2) { y -= 5; addField(l2, v2, true) }
  }

  // Title
  addTitle('AUMA Kundekartotek')
  y += 2

  // Kundeoplysninger
  addSection('KUNDEOPLYSNINGER')
  addFieldRow('Kundenummer', customer.kundenummer, 'Telefonnummer', customer.telefonnummer)
  addFieldRow('Firma', customer.firma, 'Telefonnummer 2', customer.telefonnummer2)
  addFieldRow('Navn', customer.navn, 'Fax', customer.fax)
  addFieldRow('Adresse', customer.adresse, 'Mobiltelefon', customer.mobiltelefon)
  addFieldRow('Postnr / By', `${customer.postnummer} ${customer.by_navn}`.trim(), 'Mobiltelefon 2', customer.mobiltelefon2)

  // Flow
  const hasFlow = customer.ordrenr || customer.emne || customer.foererhus || customer.undervogn
  if (hasFlow) {
    addRedSection('FLOW')
    addFieldRow('Ordrenr', customer.ordrenr, 'ID', customer.flow_id)
    addField('Emne', customer.emne)
    y += 2
    addFieldRow('Førerhus', customer.foererhus, 'Undervogn', customer.undervogn)
    addFieldRow('Skærme', customer.skaerme, 'Hjul', customer.hjul)
    addFieldRow('Kofanger', customer.kofanger, 'Kant på hjul', customer.kant_paa_hjul)
    addFieldRow('Solskærm', customer.solskaerm, 'Værktøjsks.', customer.vaerktoejsks)
    addFieldRow('Stige', customer.stige, 'Tank', customer.tank)
    addFieldRow('Tagbagage', customer.tagbagage, 'Kran', customer.kran)
    addFieldRow('Luftfilter', customer.luftfilter, 'Lift', customer.lift)
    addFieldRow('Spoiler', customer.spoiler, 'Lad opbyg', customer.lad_opbyg)
    addFieldRow('Striber/dek', customer.striber_dek, 'Fjelder', customer.fjelder)
    addFieldRow('Skrifttype', customer.skrifttype, 'Kasse', customer.kasse)
    addField('Folienr.', customer.folienr)

    if (customer.bemaerkninger) {
      y += 2
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Bemærkninger:', margin, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const lines = doc.splitTextToSize(customer.bemaerkninger, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 4
    }
  }

  // Noter
  if (customer.noter) {
    addSection('NOTER')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(customer.noter, contentWidth)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4
  }

  // Billeder
  if (images.length > 0) {
    addSection('KUNDEBILLEDER')
    y += 2
    const imgSize = 40
    const gap = 5
    const cols = Math.floor(contentWidth / (imgSize + gap))
    let col = 0

    for (const img of images) {
      try {
        if (y + imgSize > 280) { doc.addPage(); y = margin }
        const response = await fetch(img.image_url)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        const x = margin + col * (imgSize + gap)
        doc.addImage(dataUrl, 'JPEG', x, y, imgSize, imgSize)
        col++
        if (col >= cols) { col = 0; y += imgSize + gap }
      } catch { /* skip */ }
    }
  }

  // Footer
  const now = new Date()
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Udskrevet: ${now.toLocaleDateString('da-DK')} ${now.toLocaleTimeString('da-DK')}`, margin, 290)

  doc.save(`kunde-${(customer.firma || customer.navn || 'kunde').replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
