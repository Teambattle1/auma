import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { CustomerVehicle, VehicleFieldImage, FLOW_FIELDS, emptyVehicle } from '../types/customer'

const isMobile = () => /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768

interface Props {
  customerId: string
}

function FieldWithImage({
  label,
  value,
  onChange,
  fieldImage,
  onCamera,
  onFile,
  onViewImage,
  mobile,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fieldImage: VehicleFieldImage | undefined
  onCamera: () => void
  onFile: () => void
  onViewImage: (url: string, fieldName: string) => void
  mobile: boolean
  fieldName: string
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
            onClick={() => onViewImage(fieldImage.image_url, label)}
            className="w-9 h-9 rounded-md border-2 border-green-500 overflow-hidden shrink-0"
          >
            <img src={fieldImage.image_url} alt="" className="w-full h-full object-cover" />
          </button>
        ) : mobile ? (
          <button
            onClick={onCamera}
            className="w-9 h-9 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onFile}
            className="w-9 h-9 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
  const [pendingField, setPendingField] = useState<string | null>(null)
  const [mobile] = useState(isMobile)
  // Preview popup state
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [previewLabel, setPreviewLabel] = useState('')
  const [previewField, setPreviewField] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

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

  // Upload image for a field (and also save to vehicle album)
  const uploadFieldImage = async (file: File, fieldName: string) => {
    if (!activeVehicleId) return

    // Ensure proper extension (camera captures may not have one)
    let ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || ext === file.name) {
      ext = file.type === 'image/png' ? 'png' : 'jpg'
    }
    const safeFieldName = fieldName.replace(/[^a-z0-9_]/gi, '_')
    const fileName = `field-images/${activeVehicleId}/${safeFieldName}-${Date.now()}.${ext}`

    // Upload to storage
    const { error: upErr } = await supabase.storage
      .from('customer-images')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' })
    if (upErr) { alert('Upload fejl: ' + upErr.message); return }

    const imageUrl = `${supabaseUrl}/storage/v1/object/public/customer-images/${fileName}`

    // Remove old field image if exists
    const old = fieldImages.find(fi => fi.field_name === fieldName)
    if (old) {
      const oldPath = old.image_url.split('/customer-images/')[1]
      if (oldPath) await supabase.storage.from('customer-images').remove([oldPath])
      await supabase.from('vehicle_field_images').delete().eq('id', old.id)
    }

    // Save as field image
    const { error: fieldErr } = await supabase.from('vehicle_field_images').insert([{
      vehicle_id: activeVehicleId,
      field_name: fieldName,
      image_url: imageUrl,
      image_name: file.name || `${safeFieldName}.${ext}`,
    }])
    if (fieldErr) { alert('Gem fejl: ' + fieldErr.message); return }

    // Also save to customer_images in the vehicle's album
    const vehicle = vehicles.find(v => v.id === activeVehicleId)
    const vehicleIndex = vehicle ? vehicles.indexOf(vehicle) + 1 : 1
    const albumName = vehicle?.emne || `Bil ${vehicleIndex}`

    // Find or create album for this vehicle
    let albumId: string | null = null
    const { data: existingAlbums } = await supabase
      .from('customer_albums')
      .select('id')
      .eq('customer_id', customerId)
      .eq('name', albumName)
      .limit(1)

    if (existingAlbums && existingAlbums.length > 0) {
      albumId = existingAlbums[0].id
    } else {
      const { data: newAlbum } = await supabase
        .from('customer_albums')
        .insert([{ customer_id: customerId, name: albumName }])
        .select('id')
        .single()
      if (newAlbum) albumId = newAlbum.id
    }

    const fieldLabel = FLOW_FIELDS.find(f => f.key === fieldName)?.label || fieldName
    await supabase.from('customer_images').insert([{
      customer_id: customerId,
      album_id: albumId,
      image_url: imageUrl,
      image_name: `${fieldLabel}.${ext}`,
    }])

    loadFieldImages(activeVehicleId)
  }

  // Camera capture (mobile)
  const handleCameraCapture = (fieldName: string) => {
    setPendingField(fieldName)
    cameraRef.current?.click()
  }

  // File select (desktop)
  const handleFileSelect = (fieldName: string) => {
    setPendingField(fieldName)
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const field = pendingField
    if (!file || !field) return
    // Reset immediately so next click works
    setPendingField(null)
    e.target.value = ''
    await uploadFieldImage(file, field)
  }

  // View image popup with retake option
  const handleViewImage = (url: string, label: string) => {
    // Find the field name from the label
    const field = FLOW_FIELDS.find(f => f.label === label)
    setPreviewImg(url)
    setPreviewLabel(label)
    setPreviewField(field?.key || null)
  }

  const handleRetake = () => {
    if (!previewField) return
    setPreviewImg(null)
    if (mobile) {
      handleCameraCapture(previewField)
    } else {
      handleFileSelect(previewField)
    }
  }

  const handleRemoveFieldImage = async () => {
    if (!previewField || !activeVehicleId) return
    const fi = fieldImages.find(f => f.field_name === previewField)
    if (fi) {
      const path = fi.image_url.split('/customer-images/')[1]
      if (path) await supabase.storage.from('customer-images').remove([path])
      await supabase.from('vehicle_field_images').delete().eq('id', fi.id)
      loadFieldImages(activeVehicleId)
    }
    setPreviewImg(null)
  }

  const getFieldImage = (fieldName: string) =>
    fieldImages.find(fi => fi.field_name === fieldName)

  const leftFields = FLOW_FIELDS.filter(f => f.side === 'left')
  const rightFields = FLOW_FIELDS.filter(f => f.side === 'right')

  return (
    <div>
      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

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
          className="btn-red-outline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tilføj bil
        </button>
      </div>

      {/* No vehicles */}
      {vehicles.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Ingen biler tilknyttet endnu</p>
          <button onClick={handleAddVehicle} className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            Tilføj første bil
          </button>
        </div>
      )}

      {/* Vehicle form */}
      {activeVehicleId && (
        <>
          <div className="mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Emne (biltype)</label>
              <input
                type="text"
                value={formData.emne}
                onChange={e => set('emne')(e.target.value)}
                placeholder="f.eks. Volvo, Scania..."
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 shrink-0"
            >
              {saving ? 'Gemmer...' : 'Gem'}
            </button>
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="h-0.5 bg-red-600 flex-grow" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Specifikationer</span>
            <div className="h-0.5 bg-red-600 flex-grow" />
          </div>

          {mobile && (
            <p className="text-xs text-gray-400 mb-3 text-center">Tryk kamera-ikon for at tage billede til en linje</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <div className="space-y-3">
              {leftFields.map(f => (
                <FieldWithImage
                  key={f.key}
                  fieldName={f.key}
                  label={f.label}
                  value={(formData as any)[f.key] || ''}
                  onChange={set(f.key)}
                  fieldImage={getFieldImage(f.key)}
                  onCamera={() => handleCameraCapture(f.key)}
                  onFile={() => handleFileSelect(f.key)}
                  onViewImage={handleViewImage}
                  mobile={mobile}
                />
              ))}
            </div>
            <div className="space-y-3">
              {rightFields.map(f => (
                <FieldWithImage
                  key={f.key}
                  fieldName={f.key}
                  label={f.label}
                  value={(formData as any)[f.key] || ''}
                  onChange={set(f.key)}
                  fieldImage={getFieldImage(f.key)}
                  onCamera={() => handleCameraCapture(f.key)}
                  onFile={() => handleFileSelect(f.key)}
                  onViewImage={handleViewImage}
                  mobile={mobile}
                />
              ))}
            </div>
          </div>

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

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Gemmer...' : 'Gem bil'}
            </button>
            <button onClick={handleDelete} className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              Slet bil
            </button>
          </div>
        </>
      )}

      {/* Image preview popup with retake/remove */}
      {previewImg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">{previewLabel}</span>
              <button onClick={() => setPreviewImg(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">&times;</button>
            </div>
            <div className="p-4">
              <img src={previewImg} alt={previewLabel} className="w-full rounded-lg" />
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={handleRetake}
                className="btn-red flex-1 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                {mobile ? 'Tag nyt billede' : 'Vælg nyt billede'}
              </button>
              <button
                onClick={handleRemoveFieldImage}
                className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                Fjern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
