import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { CustomerImage } from '../types/customer'

/** Read EXIF orientation and return a correctly rotated blob */
async function fixOrientation(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        // drawImage with natural dimensions auto-corrects orientation in modern browsers
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

interface Props {
  customerId: string
  images: CustomerImage[]
  onImageUploaded: () => void
  onImageDelete: (imageId: string, imageUrl: string) => void
}

export default function ImageUpload({ customerId, images, onImageUploaded, onImageDelete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [sliderIndex, setSliderIndex] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const openSlider = (index: number) => setSliderIndex(index)
  const closeSlider = () => setSliderIndex(null)

  const prev = useCallback(() => {
    if (sliderIndex === null) return
    setSliderIndex(sliderIndex <= 0 ? images.length - 1 : sliderIndex - 1)
  }, [sliderIndex, images.length])

  const next = useCallback(() => {
    if (sliderIndex === null) return
    setSliderIndex(sliderIndex >= images.length - 1 ? 0 : sliderIndex + 1)
  }, [sliderIndex, images.length])

  // Keyboard navigation
  useEffect(() => {
    if (sliderIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSlider()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [sliderIndex, prev, next])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (let file of Array.from(files)) {
        // Auto-rotate based on EXIF
        if (file.type.startsWith('image/')) {
          file = await fixOrientation(file)
        }
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

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {images.map((img, i) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white">
              <img
                src={img.image_url}
                alt={img.image_name}
                className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200 p-1"
                onClick={() => openSlider(i)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] px-1.5 py-1 truncate">
                {img.image_name}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onImageDelete(img.id, img.image_url) }}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Image slider popup */}
      {sliderIndex !== null && images[sliderIndex] && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={closeSlider}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700 truncate mr-4">{images[sliderIndex].image_name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-gray-400">{sliderIndex + 1} / {images.length}</span>
                <button onClick={closeSlider} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">
                  &times;
                </button>
              </div>
            </div>

            {/* Main image with nav */}
            <div className="flex-1 flex items-center justify-center relative bg-gray-50 min-h-0 p-4">
              {images.length > 1 && (
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 text-gray-700 text-xl transition-colors z-10"
                >
                  &lsaquo;
                </button>
              )}

              <img
                src={images[sliderIndex].image_url}
                alt={images[sliderIndex].image_name}
                className="max-w-full max-h-[55vh] object-contain rounded"
              />

              {images.length > 1 && (
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 text-gray-700 text-xl transition-colors z-10"
                >
                  &rsaquo;
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2 justify-center overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSliderIndex(i)}
                      className={`w-12 h-12 rounded overflow-hidden border-2 shrink-0 transition-all ${
                        i === sliderIndex
                          ? 'border-blue-600 scale-110'
                          : 'border-gray-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
