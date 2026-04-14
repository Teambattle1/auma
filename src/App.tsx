import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseUrl } from './lib/supabase'
import { Customer, CustomerImage, emptyCustomer } from './types/customer'
import CustomerForm from './components/CustomerForm'
import FlowForm from './components/FlowForm'
import ImageUpload from './components/ImageUpload'
import ImageScanner from './components/ImageScanner'
import CustomerSearch from './components/CustomerSearch'
import { printCustomer, savePDF } from './components/CustomerPrint'
import AumaFlowIntro from './components/AumaFlowIntro'
import ScanPreview from './components/ScanPreview'

type View = 'home' | 'create' | 'edit' | 'search' | 'scan'

const isMobile = () => /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
type Tab = 'kunde' | 'flow' | 'billeder'

export default function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [view, setView] = useState<View>('home')
  const [activeTab, setActiveTab] = useState<Tab>('kunde')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerImages, setCustomerImages] = useState<CustomerImage[]>([])
  const [formData, setFormData] = useState(emptyCustomer)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadCustomers = useCallback(async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('firma', { ascending: true })
    if (data) setCustomers(data)
  }, [])

  const loadImages = useCallback(async (customerId: string) => {
    const { data } = await supabase
      .from('customer_images')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    if (data) setCustomerImages(data)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    if (selectedCustomer) {
      loadImages(selectedCustomer.id)
    } else {
      setCustomerImages([])
    }
  }, [selectedCustomer, loadImages])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      kundenummer: customer.kundenummer || '',
      firma: customer.firma || '',
      navn: customer.navn || '',
      adresse: customer.adresse || '',
      postnummer: customer.postnummer || '',
      by_navn: customer.by_navn || '',
      telefon: customer.telefon || '',
      mobil: customer.mobil || '',
      noter: customer.noter || '',
    })
    setView('edit')
  }

  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customer = customers.find(c => c.id === e.target.value)
    if (customer) handleSelectCustomer(customer)
  }

  const handleCreate = () => {
    setSelectedCustomer(null)
    setFormData({ ...emptyCustomer })
    setActiveTab('kunde')
    setView('create')
  }

  const handleSave = async () => {
    if (!formData.firma.trim() && !formData.navn.trim()) {
      showMessage('Firma eller Navn er påkrævet')
      return
    }
    setSaving(true)
    try {
      if (view === 'create') {
        const { data, error } = await supabase
          .from('customers')
          .insert([formData])
          .select()
          .single()
        if (error) throw error
        setSelectedCustomer(data)
        setView('edit')
        // Upload pending images from scan
        if (pendingImages.length > 0) {
          await uploadExtractedImages(data.id, pendingImages)
          setPendingImages([])
          loadImages(data.id)
          showMessage(`Kunde oprettet + ${pendingImages.length} billede(r) uploadet!`)
        } else {
          showMessage('Kunde oprettet!')
        }
      } else if (view === 'edit' && selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', selectedCustomer.id)
        if (error) throw error
        setSelectedCustomer({ ...selectedCustomer, ...formData })
        showMessage('Kunde opdateret!')
      }
      await loadCustomers()
    } catch (err: any) {
      showMessage('Fejl: ' + err.message)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    if (!confirm('Er du sikker på at du vil slette denne kunde?')) return
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', selectedCustomer.id)
    if (error) {
      showMessage('Fejl ved sletning: ' + error.message)
      return
    }
    setSelectedCustomer(null)
    setFormData({ ...emptyCustomer })
    setView('home')
    await loadCustomers()
    showMessage('Kunde slettet!')
  }

  const flowFields = new Set([
    'ordrenr','emne','flow_id','foererhus','skaerme','kofanger','solskaerm',
    'stige','tagbagage','luftfilter','spoiler','striber_dek','skrifttype',
    'undervogn','hjul','kant_paa_hjul','vaerktoejsks','tank','kran','lift',
    'lad_opbyg','fjelder','kasse','folienr','bemaerkninger',
  ])

  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [scanPreviewData, setScanPreviewData] = useState<Record<string, string> | null>(null)
  const [scanPendingExtracted, setScanPendingExtracted] = useState<File[]>([])

  const uploadExtractedImages = async (customerId: string, files: File[]) => {
    for (const file of files) {
      try {
        const fileName = `${customerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
        const { error: uploadError } = await supabase.storage
          .from('customer-images')
          .upload(fileName, file)
        if (uploadError) continue

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/customer-images/${fileName}`
        await supabase.from('customer_images').insert([{
          customer_id: customerId,
          image_url: imageUrl,
          image_name: file.name,
        }])
      } catch { /* skip */ }
    }
  }

  // Step 1: scan complete -> show preview for user to verify/edit
  const handleScanResult = async (_data: Partial<typeof formData>, extractedImages?: File[]) => {
    setScanPreviewData(_data as Record<string, string>)
    setScanPendingExtracted(extractedImages || [])
  }

  // Step 2: user confirms mapping -> split into kunde + flow, auto-create vehicle
  const handleScanConfirm = async (data: Record<string, string>) => {
    // Split data into customer fields and flow fields
    const kundeData: Record<string, string> = {}
    const flowData: Record<string, string> = {}
    for (const [k, v] of Object.entries(data)) {
      if (!v || !v.trim()) continue
      if (flowFields.has(k)) {
        flowData[k] = v
      } else {
        kundeData[k] = v
      }
    }

    // Apply customer fields to form
    if (Object.keys(kundeData).length > 0) {
      setFormData(prev => ({ ...prev, ...kundeData }))
    }

    const hasFlow = Object.keys(flowData).length > 0
    const hasKunde = Object.keys(kundeData).length > 0

    // Ensure customer exists first (auto-create if needed)
    let custId = selectedCustomer?.id
    if (!custId && (hasKunde || hasFlow)) {
      // Auto-create customer with scanned data
      const newCust = { ...emptyCustomer, ...kundeData }
      const { data: created, error } = await supabase
        .from('customers')
        .insert([newCust])
        .select()
        .single()
      if (error) { showMessage('Fejl: ' + error.message); return }
      setSelectedCustomer(created)
      custId = created.id
      setView('edit')
      await loadCustomers()
    } else {
      setView(selectedCustomer ? 'edit' : 'create')
    }

    // Auto-create vehicle with flow data if we have flow fields
    if (hasFlow && custId) {
      const vehicleData = {
        customer_id: custId,
        emne: flowData.emne || '',
        ordrenr: flowData.ordrenr || '',
        flow_id: flowData.flow_id || '',
        foererhus: flowData.foererhus || '',
        skaerme: flowData.skaerme || '',
        kofanger: flowData.kofanger || '',
        solskaerm: flowData.solskaerm || '',
        stige: flowData.stige || '',
        tagbagage: flowData.tagbagage || '',
        luftfilter: flowData.luftfilter || '',
        spoiler: flowData.spoiler || '',
        striber_dek: flowData.striber_dek || '',
        skrifttype: flowData.skrifttype || '',
        undervogn: flowData.undervogn || '',
        hjul: flowData.hjul || '',
        kant_paa_hjul: flowData.kant_paa_hjul || '',
        vaerktoejsks: flowData.vaerktoejsks || '',
        tank: flowData.tank || '',
        kran: flowData.kran || '',
        lift: flowData.lift || '',
        lad_opbyg: flowData.lad_opbyg || '',
        fjelder: flowData.fjelder || '',
        kasse: flowData.kasse || '',
        folienr: flowData.folienr || '',
        bemaerkninger: flowData.bemaerkninger || '',
      }
      await supabase.from('customer_vehicles').insert([vehicleData])
    }

    // Handle extracted images
    const imgs = scanPendingExtracted
    if (imgs.length > 0 && custId) {
      await uploadExtractedImages(custId, imgs)
      loadImages(custId)
    }

    // Switch to the right tab
    if (hasFlow) {
      setActiveTab('flow')
      showMessage(`Kunde + bil oprettet fra scan!${imgs.length > 0 ? ` ${imgs.length} billede(r) uploadet.` : ''}`)
    } else {
      setActiveTab('kunde')
      showMessage('Kundedata udfyldt fra scan!')
    }

    setScanPreviewData(null)
    setScanPendingExtracted([])
    setPendingImages([])
  }

  const handleScanCancel = () => {
    setScanPreviewData(null)
    setScanPendingExtracted([])
  }

  const [showPrintPicker, setShowPrintPicker] = useState(false)
  const [printMode, setPrintMode] = useState<'print' | 'pdf'>('print')

  const handlePrintClick = (mode: 'print' | 'pdf') => {
    setPrintMode(mode)
    if (selectedCustomer) {
      // Customer already selected - execute directly
      executePrint(selectedCustomer, mode)
    } else {
      // Show customer picker
      setShowPrintPicker(true)
    }
  }

  const executePrint = async (customer: Customer, mode: 'print' | 'pdf') => {
    setShowPrintPicker(false)
    showMessage(mode === 'print' ? 'Printer...' : 'Genererer PDF...')
    const { data: imgs } = await supabase
      .from('customer_images')
      .select('*')
      .eq('customer_id', customer.id)
    if (mode === 'print') {
      await printCustomer(customer, imgs || [])
    } else {
      await savePDF(customer, imgs || [])
    }
  }

  const handleImageUploaded = () => {
    if (selectedCustomer) loadImages(selectedCustomer.id)
  }

  const handleImageDelete = async (imageId: string, imageUrl: string) => {
    const path = imageUrl.split('/customer-images/')[1]
    if (path) {
      await supabase.storage.from('customer-images').remove([path])
    }
    await supabase.from('customer_images').delete().eq('id', imageId)
    if (selectedCustomer) loadImages(selectedCustomer.id)
  }

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'kunde', label: 'KUNDEOPLYSNINGER', color: 'blue' },
    { key: 'flow', label: 'FLOW', color: 'red' },
    { key: 'billeder', label: `BILLEDER (${customerImages.length})`, color: 'green' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {showIntro && <AumaFlowIntro onComplete={() => setShowIntro(false)} />}

      {/* Print customer picker popup */}
      {showPrintPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPrintPicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                {printMode === 'print' ? 'Vælg kunde til print' : 'Vælg kunde til PDF'}
              </h3>
              <button onClick={() => setShowPrintPicker(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-auto">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => executePrint(c, printMode)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-0 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-800">{c.firma || c.navn || 'Ingen navn'}</div>
                  <div className="text-xs text-gray-500">
                    {[c.kundenummer && `#${c.kundenummer}`, c.telefon].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
              {customers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Ingen kunder</p>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b-2 border-red-600">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">AUMA <span className="text-red-600">FLOW</span></h1>
        </div>
      </header>

      {message && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Action bar */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-3 md:p-4 mb-4 md:mb-6 no-print">
          {/* Search field - always visible, prominent */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Søg kunde..."
              className="w-full pl-10 pr-4 py-3 md:py-2.5 text-base md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={view === 'search' ? undefined : ''}
              onFocus={() => setView('search')}
              readOnly
            />
          </div>

          {/* Action buttons - glossy red circles with labels below */}
          <div className="flex justify-center gap-5 md:gap-6">
            {[
              { label: 'Opret', onClick: () => handleCreate(), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /> },
              { label: 'Scan', onClick: () => setView('scan'), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /> },
              { label: 'Find', onClick: () => setView('search'), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
              { label: 'Print', onClick: () => handlePrintClick('print'), icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></> },
              { label: 'PDF', onClick: () => handlePrintClick('pdf'), icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-active:scale-90"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    boxShadow: '0 6px 16px rgba(185, 28, 28, 0.45), inset 0 2px 2px rgba(255,255,255,0.3)',
                  }}
                >
                  <svg className="w-7 h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    {btn.icon}
                  </svg>
                </div>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search - full screen on mobile */}
        {view === 'search' && (
          <div className="fixed inset-0 z-40 bg-white md:relative md:inset-auto md:z-auto md:bg-white md:rounded-lg md:shadow-sm md:mb-6">
            <div className="flex flex-col h-full md:h-auto">
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 md:border-0">
                <button onClick={() => setView('home')} className="p-2 -ml-2 text-gray-500 hover:text-gray-700 md:hidden">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-800 md:hidden">Søg kunde</h2>
                <button onClick={() => setView('home')} className="hidden md:block text-gray-500 hover:text-gray-700 text-sm ml-auto">Luk</button>
              </div>
              <div className="flex-1 overflow-auto p-4 md:p-6">
                <CustomerSearch customers={customers} onSelect={(c) => { handleSelectCustomer(c); }} mobile={isMobile()} />
              </div>
            </div>
          </div>
        )}

        {/* Scan */}
        {view === 'scan' && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Upload til scan</h2>
              <button onClick={() => { setView(selectedCustomer ? 'edit' : 'home'); handleScanCancel() }} className="text-gray-500 hover:text-gray-700 text-sm">Luk</button>
            </div>
            <ImageScanner onScanComplete={handleScanResult} />
            {scanPreviewData && (
              <div className="mt-4">
                <ScanPreview
                  parsed={scanPreviewData}
                  onConfirm={handleScanConfirm}
                  onCancel={handleScanCancel}
                />
              </div>
            )}
          </div>
        )}

        {/* Customer form with tabs */}
        {(view === 'create' || view === 'edit') && (
          <div id="customer-card">
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden mb-6">
              {/* Header */}
              <div className="px-6 pt-5 pb-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  {view === 'create' ? 'Opret ny kunde' : `${selectedCustomer?.firma || selectedCustomer?.navn || 'Kunde'}`}
                </h2>
                <div className="flex gap-2 no-print">
                  {view === 'edit' && (
                    <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                      Slet
                    </button>
                  )}
                  <button onClick={() => { setView('home'); setSelectedCustomer(null) }} className="text-gray-500 hover:text-gray-700 text-sm">
                    Luk
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 md:px-6 mt-4 no-print">
                <div className="flex gap-1.5">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-4 md:py-3 text-xs font-bold tracking-wider rounded-t-lg transition-colors ${
                        activeTab === tab.key
                          ? tab.color === 'blue'
                            ? 'bg-blue-600 text-white'
                            : tab.color === 'red'
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'kunde' && (
                  <CustomerForm formData={formData} setFormData={setFormData} />
                )}

                {activeTab === 'flow' && selectedCustomer && (
                  <FlowForm customerId={selectedCustomer.id} />
                )}

                {activeTab === 'flow' && !selectedCustomer && (
                  <p className="text-sm text-gray-400 text-center py-8">Gem kunden først for at tilføje biler</p>
                )}

                {activeTab === 'billeder' && view === 'edit' && selectedCustomer && (
                  <ImageUpload
                    customerId={selectedCustomer.id}
                    images={customerImages}
                    onImageUploaded={handleImageUploaded}
                    onImageDelete={handleImageDelete}
                  />
                )}

                {activeTab === 'billeder' && view === 'create' && (
                  <p className="text-sm text-gray-400 text-center py-8">Gem kunden først for at uploade billeder</p>
                )}
              </div>

              {/* Save bar */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 no-print">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-red px-6 disabled:opacity-50"
                >
                  {saving ? 'Gemmer...' : (view === 'create' ? 'Opret kunde' : 'Gem ændringer')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Home */}
        {view === 'home' && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg text-gray-500 mb-2">Vælg en kunde fra dropdown eller brug knapperne ovenfor</h3>
            <p className="text-sm text-gray-400">{customers.length} kunder i databasen</p>
          </div>
        )}
      </main>
    </div>
  )
}
