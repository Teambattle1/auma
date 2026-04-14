import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Customer, CustomerImage, emptyCustomer } from './types/customer'
import CustomerForm from './components/CustomerForm'
import ImageUpload from './components/ImageUpload'
import ImageScanner from './components/ImageScanner'
import CustomerSearch from './components/CustomerSearch'
import { generatePDF } from './components/CustomerPrint'
import AumaFlowIntro from './components/AumaFlowIntro'

type View = 'home' | 'create' | 'edit' | 'search' | 'scan'

export default function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [view, setView] = useState<View>('home')
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
      .order('firma_navn', { ascending: true })
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
      firma_navn: customer.firma_navn,
      cvr_nummer: customer.cvr_nummer,
      adresse: customer.adresse,
      postnummer: customer.postnummer,
      by_navn: customer.by_navn,
      land: customer.land,
      kontaktperson: customer.kontaktperson,
      titel: customer.titel,
      telefon: customer.telefon,
      mobil: customer.mobil,
      email: customer.email,
      betalingsbetingelser: customer.betalingsbetingelser,
      kredit_limit: customer.kredit_limit,
      noter: customer.noter,
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
    setView('create')
  }

  const handleSave = async () => {
    if (!formData.firma_navn.trim()) {
      showMessage('Firmanavn er påkrævet')
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
        showMessage('Kunde oprettet!')
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

  const handleScanResult = (data: Partial<typeof formData>) => {
    setFormData(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
      ),
    }))
    setView(selectedCustomer ? 'edit' : 'create')
    showMessage('Data udfyldt fra scanning!')
  }

  const handlePrint = async () => {
    if (!selectedCustomer) {
      showMessage('Vælg en kunde først')
      return
    }
    await generatePDF(selectedCustomer, customerImages)
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* AUMA FLOW Intro Animation */}
      {showIntro && <AumaFlowIntro onComplete={() => setShowIntro(false)} />}

      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-red-600">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">AUMA Kundekartotek</h1>
          <p className="text-sm text-gray-500 mt-1">Kundedatabase med billeder og scanning</p>
        </div>
      </header>

      {/* Message toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Action buttons + Dropdown */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Customer dropdown */}
            <select
              className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCustomer?.id || ''}
              onChange={handleDropdownSelect}
            >
              <option value="">-- Vælg kunde ({customers.length}) --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firma_navn} {c.kontaktperson ? `(${c.kontaktperson})` : ''}
                </option>
              ))}
            </select>

            {/* 4 main buttons */}
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Opret Ny
            </button>
            <button
              onClick={() => setView('search')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Find
            </button>
            <button
              onClick={() => setView('scan')}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Scan
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>
        </div>

        {/* Search view */}
        {view === 'search' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Søg kunde</h2>
              <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700 text-sm">Luk</button>
            </div>
            <CustomerSearch
              customers={customers}
              onSelect={(c) => {
                handleSelectCustomer(c)
              }}
            />
          </div>
        )}

        {/* Scan view */}
        {view === 'scan' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Scan dokument</h2>
              <button onClick={() => setView(selectedCustomer ? 'edit' : 'home')} className="text-gray-500 hover:text-gray-700 text-sm">Luk</button>
            </div>
            <ImageScanner onScanComplete={handleScanResult} />
          </div>
        )}

        {/* Customer form (create or edit) */}
        {(view === 'create' || view === 'edit') && (
          <div id="customer-card">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {view === 'create' ? 'Opret ny kunde' : `Rediger: ${selectedCustomer?.firma_navn}`}
                </h2>
                <div className="flex gap-2 no-print">
                  {view === 'edit' && (
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Slet kunde
                    </button>
                  )}
                  <button
                    onClick={() => { setView('home'); setSelectedCustomer(null); }}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Luk
                  </button>
                </div>
              </div>

              <CustomerForm formData={formData} setFormData={setFormData} />

              <div className="mt-6 flex gap-3 no-print">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Gemmer...' : (view === 'create' ? 'Opret kunde' : 'Gem ændringer')}
                </button>
                <button
                  onClick={() => setView('scan')}
                  className="px-4 py-2.5 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
                >
                  Scan og udfyld
                </button>
              </div>
            </div>

            {/* Image section - only for existing customers */}
            {view === 'edit' && selectedCustomer && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Billeder</h2>
                <div className="border-t-2 border-blue-600 pt-4">
                  <ImageUpload
                    customerId={selectedCustomer.id}
                    images={customerImages}
                    onImageUploaded={handleImageUploaded}
                    onImageDelete={handleImageDelete}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Home / empty state */}
        {view === 'home' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
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
