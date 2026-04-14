import { useState } from 'react'

const FIELD_LABELS: Record<string, string> = {
  // Kundeoplysninger
  kundenummer: 'Kundenummer',
  firma: 'Firma',
  navn: 'Navn',
  adresse: 'Adresse',
  postnummer: 'Postnummer',
  by_navn: 'By',
  telefonnummer: 'Telefonnummer',
  telefonnummer2: 'Telefonnummer 2',
  fax: 'Fax',
  mobiltelefon: 'Mobiltelefon',
  mobiltelefon2: 'Mobiltelefon 2',
  noter: 'Noter',
  // Flow
  ordrenr: 'Ordrenr',
  emne: 'Emne',
  flow_id: 'ID',
  foererhus: 'Førerhus',
  skaerme: 'Skærme',
  kofanger: 'Kofanger',
  solskaerm: 'Solskærm',
  stige: 'Stige',
  tagbagage: 'Tagbagage',
  luftfilter: 'Luftfilter',
  spoiler: 'Spoiler',
  striber_dek: 'Striber/dek',
  skrifttype: 'Skrifttype',
  undervogn: 'Undervogn',
  hjul: 'Hjul',
  kant_paa_hjul: 'Kant på hjul',
  vaerktoejsks: 'Værktøjsks.',
  tank: 'Tank',
  kran: 'Kran',
  lift: 'Lift',
  lad_opbyg: 'Lad opbyg',
  fjelder: 'Fjelder',
  kasse: 'Kasse',
  folienr: 'Folienr.',
  bemaerkninger: 'Bemærkninger',
}

const ALL_FIELDS = Object.keys(FIELD_LABELS)

interface Props {
  parsed: Record<string, string>
  onConfirm: (data: Record<string, string>) => void
  onCancel: () => void
}

export default function ScanPreview({ parsed, onConfirm, onCancel }: Props) {
  const [data, setData] = useState<Record<string, string>>({ ...parsed })

  const update = (field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const remove = (field: string) => {
    setData(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Fields that have values
  const filledFields = Object.entries(data).filter(([_, v]) => v && v !== '-')
  // Fields without values (for "add" dropdown)
  const emptyFields = ALL_FIELDS.filter(f => !data[f])

  const handleAdd = (field: string) => {
    setData(prev => ({ ...prev, [field]: '' }))
  }

  const kundeFields = filledFields.filter(([k]) => !['ordrenr','emne','flow_id','foererhus','skaerme','kofanger','solskaerm','stige','tagbagage','luftfilter','spoiler','striber_dek','skrifttype','undervogn','hjul','kant_paa_hjul','vaerktoejsks','tank','kran','lift','lad_opbyg','fjelder','kasse','folienr','bemaerkninger'].includes(k))
  const flowFields = filledFields.filter(([k]) => ['ordrenr','emne','flow_id','foererhus','skaerme','kofanger','solskaerm','stige','tagbagage','luftfilter','spoiler','striber_dek','skrifttype','undervogn','hjul','kant_paa_hjul','vaerktoejsks','tank','kran','lift','lad_opbyg','fjelder','kasse','folienr','bemaerkninger'].includes(k))

  const renderField = ([field, value]: [string, string]) => (
    <div key={field} className="flex items-center gap-2 py-1.5">
      <span className="text-xs font-medium text-gray-500 w-28 shrink-0">{FIELD_LABELS[field] || field}</span>
      <input
        type="text"
        value={value}
        onChange={e => update(field, e.target.value)}
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
      />
      <button onClick={() => remove(field)} className="text-red-400 hover:text-red-600 text-xs shrink-0">
        &times;
      </button>
    </div>
  )

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Scan resultat - tjek og ret felter</h3>
        <span className="text-xs text-gray-400">{filledFields.length} felter fundet</span>
      </div>

      {/* Kundeoplysninger */}
      {kundeFields.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Kundeoplysninger</div>
          {kundeFields.map(renderField)}
        </div>
      )}

      {/* Flow */}
      {flowFields.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-red-600 uppercase mb-1">Flow</div>
          {flowFields.map(renderField)}
        </div>
      )}

      {filledFields.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">Ingen felter fundet fra scan</p>
      )}

      {/* Add field */}
      {emptyFields.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-600"
            onChange={e => { if (e.target.value) handleAdd(e.target.value); e.target.value = '' }}
            defaultValue=""
          >
            <option value="">+ Tilføj felt...</option>
            {emptyFields.map(f => (
              <option key={f} value={f}>{FIELD_LABELS[f]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => onConfirm(Object.fromEntries(Object.entries(data).filter(([_, v]) => v && v.trim())))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Anvend data
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
        >
          Annuller
        </button>
      </div>
    </div>
  )
}
