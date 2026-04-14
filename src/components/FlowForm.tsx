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
}: {
  label: string
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
      />
    </div>
  )
}

export default function FlowForm({ formData, setFormData }: Props) {
  const set = (field: keyof FormData) => (val: string) =>
    setFormData(prev => ({ ...prev, [field]: val }))

  return (
    <div>
      {/* Top row: Ordrenr + Emne + ID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Field label="Ordrenr" value={formData.ordrenr} onChange={set('ordrenr')} />
        <Field label="Emne" value={formData.emne} onChange={set('emne')} />
        <Field label="ID" value={formData.flow_id} onChange={set('flow_id')} />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-0.5 bg-red-600 flex-grow" />
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Specifikationer</span>
        <div className="h-0.5 bg-red-600 flex-grow" />
      </div>

      {/* Two-column layout matching the card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
        {/* Left column */}
        <div className="space-y-3">
          <Field label="Førerhus" value={formData.foererhus} onChange={set('foererhus')} />
          <Field label="Skærme" value={formData.skaerme} onChange={set('skaerme')} />
          <Field label="Kofanger" value={formData.kofanger} onChange={set('kofanger')} />
          <Field label="Solskærm" value={formData.solskaerm} onChange={set('solskaerm')} />
          <Field label="Stige" value={formData.stige} onChange={set('stige')} />
          <Field label="Tagbagage" value={formData.tagbagage} onChange={set('tagbagage')} />
          <Field label="Luftfilter" value={formData.luftfilter} onChange={set('luftfilter')} />
          <Field label="Spoiler" value={formData.spoiler} onChange={set('spoiler')} />
          <Field label="Striber/dek" value={formData.striber_dek} onChange={set('striber_dek')} />
          <Field label="Skrifttype" value={formData.skrifttype} onChange={set('skrifttype')} />
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Field label="Undervogn" value={formData.undervogn} onChange={set('undervogn')} />
          <Field label="Hjul" value={formData.hjul} onChange={set('hjul')} />
          <Field label="Kant på hjul" value={formData.kant_paa_hjul} onChange={set('kant_paa_hjul')} />
          <Field label="Værktøjsks." value={formData.vaerktoejsks} onChange={set('vaerktoejsks')} />
          <Field label="Tank" value={formData.tank} onChange={set('tank')} />
          <Field label="Kran" value={formData.kran} onChange={set('kran')} />
          <Field label="Lift" value={formData.lift} onChange={set('lift')} />
          <Field label="Lad opbyg" value={formData.lad_opbyg} onChange={set('lad_opbyg')} />
          <Field label="Fjelder" value={formData.fjelder} onChange={set('fjelder')} />
          <Field label="Kasse" value={formData.kasse} onChange={set('kasse')} />
          <Field label="Folienr." value={formData.folienr} onChange={set('folienr')} />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-0.5 bg-red-600 flex-grow" />
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Bemærkninger</span>
        <div className="h-0.5 bg-red-600 flex-grow" />
      </div>

      <textarea
        value={formData.bemaerkninger}
        onChange={e => set('bemaerkninger')(e.target.value)}
        rows={4}
        placeholder="Bemærkninger til ordren..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y"
      />
    </div>
  )
}
