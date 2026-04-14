export interface Customer {
  id: string
  kundenummer: string
  firma: string
  navn: string
  adresse: string
  postnummer: string
  by_navn: string
  telefon: string
  mobil: string
  noter: string
  created_at: string
  updated_at: string
}

export interface CustomerVehicle {
  id: string
  customer_id: string
  emne: string
  ordrenr: string
  flow_id: string
  foererhus: string
  skaerme: string
  kofanger: string
  solskaerm: string
  stige: string
  tagbagage: string
  luftfilter: string
  spoiler: string
  striber_dek: string
  skrifttype: string
  undervogn: string
  hjul: string
  kant_paa_hjul: string
  vaerktoejsks: string
  tank: string
  kran: string
  lift: string
  lad_opbyg: string
  fjelder: string
  kasse: string
  folienr: string
  bemaerkninger: string
  created_at: string
}

export interface VehicleFieldImage {
  id: string
  vehicle_id: string
  field_name: string
  image_url: string
  image_name: string
  created_at: string
}

export interface CustomerAlbum {
  id: string
  customer_id: string
  name: string
  created_at: string
}

export interface CustomerImage {
  id: string
  customer_id: string
  album_id: string | null
  image_url: string
  image_name: string
  created_at: string
}

export const emptyCustomer: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
  kundenummer: '',
  firma: '',
  navn: '',
  adresse: '',
  postnummer: '',
  by_navn: '',
  telefon: '',
  mobil: '',
  noter: '',
}

export const emptyVehicle = {
  emne: '',
  ordrenr: '',
  flow_id: '',
  foererhus: '',
  skaerme: '',
  kofanger: '',
  solskaerm: '',
  stige: '',
  tagbagage: '',
  luftfilter: '',
  spoiler: '',
  striber_dek: '',
  skrifttype: '',
  undervogn: '',
  hjul: '',
  kant_paa_hjul: '',
  vaerktoejsks: '',
  tank: '',
  kran: '',
  lift: '',
  lad_opbyg: '',
  fjelder: '',
  kasse: '',
  folienr: '',
  bemaerkninger: '',
}

// Flow field definitions for display
export const FLOW_FIELDS: { key: string; label: string; side: 'left' | 'right' }[] = [
  { key: 'foererhus', label: 'Førerhus', side: 'left' },
  { key: 'skaerme', label: 'Skærme', side: 'left' },
  { key: 'kofanger', label: 'Kofanger', side: 'left' },
  { key: 'solskaerm', label: 'Solskærm', side: 'left' },
  { key: 'stige', label: 'Stige', side: 'left' },
  { key: 'tagbagage', label: 'Tagbagage', side: 'left' },
  { key: 'luftfilter', label: 'Luftfilter', side: 'left' },
  { key: 'spoiler', label: 'Spoiler', side: 'left' },
  { key: 'striber_dek', label: 'Striber/dek', side: 'left' },
  { key: 'skrifttype', label: 'Skrifttype', side: 'left' },
  { key: 'undervogn', label: 'Undervogn', side: 'right' },
  { key: 'hjul', label: 'Hjul', side: 'right' },
  { key: 'kant_paa_hjul', label: 'Kant på hjul', side: 'right' },
  { key: 'vaerktoejsks', label: 'Værktøjsks.', side: 'right' },
  { key: 'tank', label: 'Tank', side: 'right' },
  { key: 'kran', label: 'Kran', side: 'right' },
  { key: 'lift', label: 'Lift', side: 'right' },
  { key: 'lad_opbyg', label: 'Lad opbyg', side: 'right' },
  { key: 'fjelder', label: 'Fjelder', side: 'right' },
  { key: 'kasse', label: 'Kasse', side: 'right' },
  { key: 'folienr', label: 'Folienr.', side: 'right' },
]
