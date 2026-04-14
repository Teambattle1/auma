import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { CustomerVehicle, VehicleFieldImage, FLOW_FIELDS, emptyVehicle } from '../types/customer'

interface Props {
  customerId: string
}

function FieldWithImage({
  label,
  value,
  onChange,
  fieldImage,
  onAttachImage,
  onViewImage,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fieldImage: VehicleFieldImage | undefined
  onAttachImage: () => void
  onViewImage: (url: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        {fieldImage ? (
          <button
            onClick={() => onViewImage(fieldImage.image_url)}
            className="w-9 h-9 rounded-md border-2 border-green-500 overflow-hidden shrink-0"
            title="Vis billede"
          >
            <img src={fieldImage.image_url} alt="" className="w-full h-full object-cover" />
          </button>
        ) : (
          <button
            onClick={onAttachImage}
            className="w-9 h-9 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 shrink-0 transition-colors"
            title="Tilknyt billede"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function FlowForm({ customerId }: Props) {
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyVehicle)
  const [fieldImages, setFieldImages] = useState<VehicleFieldImage[]>([])
  const [saving, setSaving] = useState(false)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [pendingField, setPendingField] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadVehicles = useCallback(async () => {
    const { data } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })
    if (data) {
      setVehicles(data)
      if (data.length > 0 && !activeVehicleId) {
        setActiveVehicleId(data[0].id)
        loadVehicleData(data[0])
      }
    }
  }, [customerId])

  const loadFieldImages = useCallback(async (vehicleId: string) => {
    const { data } = await supabase
      .from('vehicle_field_images')
      .select('*')
      .eq('vehicle_id', vehicleId)
    if (data) setFieldImages(data)
  }, [])

  const loadVehicleData = (v: CustomerVehicle) => {
    const { id, customer_id, created_at, ...rest } = v
    setFormData(rest)
  }

  useEffect(() => { loadVehicles() }, [loadVehicles])

  useEffect(() => {
    if (activeVehicleId) loadFieldImages(activeVehicleId)
    else setFieldImages([])
  }, [activeVehicleId, loadFieldImages])

  const selectVehicle = (v: CustomerVehicle) => {
    setActiveVehicleId(v.id)
    loadVehicleData(v)
    loadFieldImages(v.id)
  }

  const set = (field: string) => (val: string) =>
    setFormData(prev => ({ ...prev, [field]: val }))

  const handleAddVehicle = async () => {
    let newData = { ...emptyVehicle }

    if (vehicles.length > 0) {
      const copyFrom = confirm(`Kopiér data fra "${vehicles[0].emne || 'Bil 1'}" til ny bil?`)
      if (copyFrom) {
        const src = vehicles[0]
        const { id, customer_id, created_at, emne, ...rest } = src
        newData = { ...rest, emne: '' }
      }
    }

    const { data, error } = await supabase
      .from('customer_vehicles')
      .insert([{ customer_id: customerId, ...newData }])
      .select()
      .single()
    if (error) { alert('Fejl: ' + error.message); return }
    if (data) {
      // Create image album for this vehicle
      await supabase.from('customer_albums').insert([{
        customer_id: customerId,
        name: data.emne || `Bil ${vehicles.length + 1}`,
      }])
      await loadVehicles()
      selectVehicle(data)
    }
  }

  const handleSave = async () => {
    if (!activeVehicleId) return
    setSaving(true)
    const { error } = await supabase
      .from('customer_vehicles')
      .update(formData)
      .eq('id', activeVehicleId)
    if (error) alert('Fejl: ' + error.message)
    setSaving(false)
    await loadVehicles()
  }

  const handleDelete = async () => {
    if (!activeVehicleId) return
    if (!confirm('Slet denne bil?')) return
    await supabase.from('customer_vehicles').delete().eq('id', activeVehicleId)
    setActiveVehicleId(null)
    setFormData(emptyVehicle)
    await loadVehicles()
  }

  // Per-field image upload
  const handleAttachImage = (fieldName: string) => {
    setPendingField(fieldName)
    fileRef.current?.click()
  }

  const handleFieldImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingField || !activeVehicleId) return

    const fileName = `field-images/${activeVehicleId}/${pendingField}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('customer-images').upload(fileName, file)
    if (upErr) { alert('Upload fejl: ' + upErr.message); return }

    const imageUrl = `${supabaseUrl}/storage/v1/object/public/customer-images/${fileName}`

    // Remove old image for this field
    const old = fieldImages.find(fi => fi.field_name === pendingField)
    if (old) {
      const oldPath = old.image_url.split('/customer-images/')[1]
      if (oldPath) await supabase.storage.from('customer-images').remove([oldPath])
      await supabase.from('vehicle_field_images').delete().eq('id', old.id)
    }

    await supabase.from('vehicle_field_images').insert([{
      vehicle_id: activeVehicleId,
      field_name: pendingField,
      image_url: imageUrl,
      image_name: file.name,
    }])

    setPendingField(null)
    if (fileRef.current) fileRef.current.value = ''
    loadFieldImages(activeVehicleId)
  }

  const getFieldImage = (fieldName: string) =>
    fieldImages.find(fi => fi.field_name === fieldName)

  const leftFields = FLOW_FIELDS.filter(f => f.side === 'left')
  const rightFields = FLOW_FIELDS.filter(f => f.side === 'right')

  return (
    <div>
      {/* Hidden file input for field images */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFieldImageUpload} />

      {/* Vehicle selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => selectVehicle(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeVehicleId === v.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1m0 0V6a1 1 0 011-1h2a1 1 0 011 1v10l-2 1-2-1z" />
            </svg>
            {v.emne || `Bil ${vehicles.indexOf(v) + 1}`}
          </button>
        ))}
        <button
          onClick={handleAddVehicle}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tilføj bil
        </button>
      </div>

      {/* No vehicles state */}
      {vehicles.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Ingen biler tilknyttet endnu</p>
          <button
            onClick={handleAddVehicle}
            className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Tilføj første bil
          </button>
        </div>
      )}

      {/* Vehicle form */}
      {activeVehicleId && (
        <>
          {/* Emne (vehicle name) - prominent */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Emne (biltype)</label>
            <input
              type="text"
              value={formData.emne}
              onChange={e => set('emne')(e.target.value)}
              placeholder="f.eks. Volvo, Scania..."
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-0.5 bg-red-600 flex-grow" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Specifikationer</span>
            <div className="h-0.5 bg-red-600 flex-grow" />
          </div>

          {/* Two-column spec fields with per-field image attachment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <div className="space-y-3">
              {leftFields.map(f => (
                <FieldWithImage
                  key={f.key}
                  label={f.label}
                  value={(formData as any)[f.key] || ''}
                  onChange={set(f.key)}
                  fieldImage={getFieldImage(f.key)}
                  onAttachImage={() => handleAttachImage(f.key)}
                  onViewImage={setPreviewImg}
                />
              ))}
            </div>
            <div className="space-y-3">
              {rightFields.map(f => (
                <FieldWithImage
                  key={f.key}
                  label={f.label}
                  value={(formData as any)[f.key] || ''}
                  onChange={set(f.key)}
                  fieldImage={getFieldImage(f.key)}
                  onAttachImage={() => handleAttachImage(f.key)}
                  onViewImage={setPreviewImg}
                />
              ))}
            </div>
          </div>

          {/* Bemærkninger */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-0.5 bg-red-600 flex-grow" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Bemærkninger</span>
            <div className="h-0.5 bg-red-600 flex-grow" />
          </div>
          <textarea
            value={formData.bemaerkninger}
            onChange={e => set('bemaerkninger')(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y"
          />

          {/* Save / Delete */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Gemmer...' : 'Gem bil'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Slet bil
            </button>
          </div>
        </>
      )}

      {/* Image preview popup */}
      {previewImg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setPreviewImg(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2">
              <button onClick={() => setPreviewImg(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">&times;</button>
            </div>
            <div className="px-4 pb-4">
              <img src={previewImg} alt="Felt billede" className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
