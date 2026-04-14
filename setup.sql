-- AUMA Kundekartotek - Database Setup
-- Kør dette i Supabase SQL Editor

-- Drop gammel tabel (hvis den eksisterer fra tidligere setup)
DROP TABLE IF EXISTS public.customer_images CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Kunde tabel
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Kundeoplysninger
  kundenummer TEXT DEFAULT '',
  firma TEXT DEFAULT '',
  navn TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  postnummer TEXT DEFAULT '',
  by_navn TEXT DEFAULT '',
  telefonnummer TEXT DEFAULT '',
  telefonnummer2 TEXT DEFAULT '',
  fax TEXT DEFAULT '',
  mobiltelefon TEXT DEFAULT '',
  mobiltelefon2 TEXT DEFAULT '',
  noter TEXT DEFAULT '',
  -- Flow
  ordrenr TEXT DEFAULT '',
  emne TEXT DEFAULT '',
  flow_id TEXT DEFAULT '',
  foererhus TEXT DEFAULT '',
  skaerme TEXT DEFAULT '',
  kofanger TEXT DEFAULT '',
  solskaerm TEXT DEFAULT '',
  stige TEXT DEFAULT '',
  tagbagage TEXT DEFAULT '',
  luftfilter TEXT DEFAULT '',
  spoiler TEXT DEFAULT '',
  striber_dek TEXT DEFAULT '',
  skrifttype TEXT DEFAULT '',
  undervogn TEXT DEFAULT '',
  hjul TEXT DEFAULT '',
  kant_paa_hjul TEXT DEFAULT '',
  vaerktoejsks TEXT DEFAULT '',
  tank TEXT DEFAULT '',
  kran TEXT DEFAULT '',
  lift TEXT DEFAULT '',
  lad_opbyg TEXT DEFAULT '',
  fjelder TEXT DEFAULT '',
  kasse TEXT DEFAULT '',
  folienr TEXT DEFAULT '',
  bemaerkninger TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kunde album (mapper)
CREATE TABLE public.customer_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kunde billeder
CREATE TABLE public.customer_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES public.customer_albums(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  image_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to customer_albums" ON public.customer_albums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to customer_images" ON public.customer_images FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-images', 'customer-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public upload to customer-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer-images');
CREATE POLICY "Allow public read from customer-images" ON storage.objects FOR SELECT USING (bucket_id = 'customer-images');
CREATE POLICY "Allow public delete from customer-images" ON storage.objects FOR DELETE USING (bucket_id = 'customer-images');
