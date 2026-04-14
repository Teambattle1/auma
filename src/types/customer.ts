export interface Customer {
  id: string
  firma_navn: string
  cvr_nummer: string
  adresse: string
  postnummer: string
  by_navn: string
  land: string
  kontaktperson: string
  titel: string
  telefon: string
  mobil: string
  email: string
  betalingsbetingelser: string
  kredit_limit: number
  noter: string
  created_at: string
  updated_at: string
}

export interface CustomerImage {
  id: string
  customer_id: string
  image_url: string
  image_name: string
  created_at: string
}

export const emptyCustomer: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
  firma_navn: '',
  cvr_nummer: '',
  adresse: '',
  postnummer: '',
  by_navn: '',
  land: 'Danmark',
  kontaktperson: '',
  titel: '',
  telefon: '',
  mobil: '',
  email: '',
  betalingsbetingelser: '',
  kredit_limit: 0,
  noter: '',
}
