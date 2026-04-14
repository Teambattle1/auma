import { emptyCustomer } from '../types/customer'

type FormData = typeof emptyCustomer

interface Props {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  wide = false,
}: {
  label: string
  value: string | number
  onChange: (val: string) => void
  type?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="col-span-full mt-4 mb-2">
      <div className="flex items-center gap-3">
        <div className="h-0.5 bg-blue-600 flex-grow" />
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">
          {title}
        </span>
        <div className="h-0.5 bg-blue-600 flex-grow" />
      </div>
    </div>
  )
}

export default function CustomerForm({ formData, setFormData }: Props) {
  const set = (field: keyof FormData) => (val: string) =>
    setFormData(prev => ({ ...prev, [field]: field === 'kredit_limit' ? Number(val) || 0 : val }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {/* Firmadata */}
      <SectionDivider title="Firmadata" />
      <Field label="Firmanavn *" value={formData.firma_navn} onChange={set('firma_navn')} />
      <Field label="CVR-nummer" value={formData.cvr_nummer} onChange={set('cvr_nummer')} />
      <Field label="Adresse" value={formData.adresse} onChange={set('adresse')} wide />
      <Field label="Postnummer" value={formData.postnummer} onChange={set('postnummer')} />
      <Field label="By" value={formData.by_navn} onChange={set('by_navn')} />
      <Field label="Land" value={formData.land} onChange={set('land')} />

      {/* Kontaktperson */}
      <SectionDivider title="Kontaktperson" />
      <Field label="Kontaktperson" value={formData.kontaktperson} onChange={set('kontaktperson')} />
      <Field label="Titel" value={formData.titel} onChange={set('titel')} />
      <Field label="Telefon" value={formData.telefon} onChange={set('telefon')} type="tel" />
      <Field label="Mobil" value={formData.mobil} onChange={set('mobil')} type="tel" />
      <Field label="Email" value={formData.email} onChange={set('email')} type="email" wide />

      {/* Økonomi */}
      <SectionDivider title="Økonomi" />
      <Field label="Betalingsbetingelser" value={formData.betalingsbetingelser} onChange={set('betalingsbetingelser')} />
      <Field label="Kredit limit (DKK)" value={formData.kredit_limit} onChange={set('kredit_limit')} type="number" />

      {/* Noter */}
      <SectionDivider title="Noter" />
      <Field label="Noter" value={formData.noter} onChange={set('noter')} type="textarea" wide />
    </div>
  )
}
