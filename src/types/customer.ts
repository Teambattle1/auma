export interface Customer {
  id: string
  // Kundeoplysninger
  kundenummer: string
  firma: string
  navn: string
  adresse: string
  postnummer: string
  by_navn: string
  telefonnummer: string
  telefonnummer2: string
  fax: string
  mobiltelefon: string
  mobiltelefon2: string
  noter: string
  // Flow
  ordrenr: string
  emne: string
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
  updated_at: string
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
  telefonnummer: '',
  telefonnummer2: '',
  fax: '',
  mobiltelefon: '',
  mobiltelefon2: '',
  noter: '',
  ordrenr: '',
  emne: '',
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
