import jsPDF from 'jspdf'
import { Customer, CustomerImage } from '../types/customer'

export async function generatePDF(customer: Customer, images: CustomerImage[]) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Helper functions
  const addTitle = (text: string) => {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 10
  }

  const addSection = (title: string) => {
    y += 4
    doc.setDrawColor(37, 99, 235) // blue-600
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

  const addField = (label: string, value: string | number, inline = false) => {
    if (!value && value !== 0) return
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label + ':', inline ? margin + contentWidth / 2 : margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const labelWidth = doc.getTextWidth(label + ': ')
    doc.text(
      String(value),
      (inline ? margin + contentWidth / 2 : margin) + labelWidth + 1,
      y
    )
    if (!inline) y += 5
  }

  const addFieldRow = (label1: string, val1: string | number, label2: string, val2: string | number) => {
    addField(label1, val1)
    if (val2) {
      y -= 5
      addField(label2, val2, true)
    }
    y += 0
  }

  // Title
  addTitle('AUMA Kundekartotek')
  y += 2

  // Firmadata
  addSection('FIRMADATA')
  addFieldRow('Firmanavn', customer.firma_navn, 'CVR', customer.cvr_nummer)
  addField('Adresse', customer.adresse)
  addFieldRow('Postnummer', customer.postnummer, 'By', customer.by_navn)
  addField('Land', customer.land)

  // Kontaktperson
  addSection('KONTAKTPERSON')
  addFieldRow('Kontaktperson', customer.kontaktperson, 'Titel', customer.titel)
  addFieldRow('Telefon', customer.telefon, 'Mobil', customer.mobil)
  addField('Email', customer.email)

  // Økonomi
  addSection('ØKONOMI')
  addFieldRow('Betalingsbetingelser', customer.betalingsbetingelser, 'Kredit limit', customer.kredit_limit ? `${customer.kredit_limit} DKK` : '')

  // Noter
  if (customer.noter) {
    addSection('NOTER')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(customer.noter, contentWidth)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4
  }

  // Images
  if (images.length > 0) {
    addSection('BILLEDER')
    y += 2

    const imgSize = 40
    const gap = 5
    const cols = Math.floor(contentWidth / (imgSize + gap))
    let col = 0

    for (const img of images) {
      try {
        // Check if we need a new page
        if (y + imgSize > 280) {
          doc.addPage()
          y = margin
        }

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
        if (col >= cols) {
          col = 0
          y += imgSize + gap
        }
      } catch {
        // Skip images that fail to load
      }
    }
  }

  // Footer
  const now = new Date()
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Udskrevet: ${now.toLocaleDateString('da-DK')} ${now.toLocaleTimeString('da-DK')}`,
    margin,
    290
  )

  doc.save(`kunde-${customer.firma_navn.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
