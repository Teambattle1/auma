import { useState, useRef } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { CustomerImage } from '../types/customer'

interface Props {
  customerId: string
  images: CustomerImage[]
  onImageUploaded: () => void
  onImageDelete: (imageId: string, imageUrl: string) => void
}

export default function ImageUpload({ customerId, images, onImageUploaded, onImageDelete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const fileName = `${customerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('customer-images')
          .upload(fileName, file)
        if (uploadError) throw uploadError

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/customer-images/${fileName}`

        const { error: dbError } = await supabase
          .from('customer_images')
          .insert([{
            customer_id: customerId,
            image_url: imageUrl,
            image_name: file.name,
          }])
        if (dbError) throw dbError
      }
      onImageUploaded()
    } catch (err: any) {
      alert('Upload fejl: ' + err.message)
    }
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      {/* Upload button */}
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploading ? 'Uploader...' : 'Upload billeder'}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <span className="ml-3 text-xs text-gray-400">{images.length} billede(r)</span>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={img.image_url}
                alt={img.image_name}
                className="w-full h-32 object-cover cursor-pointer"
                onClick={() => setPreviewImage(img.image_url)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                {img.image_name}
              </div>
              <button
                onClick={() => onImageDelete(img.id, img.image_url)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  )
}
