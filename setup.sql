-- AUMA FLOW v1.2 - Fuld database reset
-- Kør i Supabase SQL Editor: https://supabase.com/dashboard/project/jxyzrkrfbkrsdkmjqxwy/sql/new

-- Drop alt og start forfra
DROP TABLE IF EXISTS public.vehicle_field_images CASCADE;
DROP TABLE IF EXISTS public.customer_vehicles CASCADE;
DROP TABLE IF EXISTS public.customer_albums CASCADE;
DROP TABLE IF EXISTS public.customer_images CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Kunder
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kundenummer TEXT DEFAULT '',
  firma TEXT DEFAULT '',
  navn TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  postnummer TEXT DEFAULT '',
  by_navn TEXT DEFAULT '',
  telefon TEXT DEFAULT '',
  mobil TEXT DEFAULT '',
  noter TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Biler (Flow)
CREATE TABLE public.customer_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  emne TEXT DEFAULT '',
  ordrenr TEXT DEFAULT '',
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Felt-billeder per bil
CREATE TABLE public.vehicle_field_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billedmapper
CREATE TABLE public.customer_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kundebilleder
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
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_field_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_vehicles" ON public.customer_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_field_images" ON public.vehicle_field_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_albums" ON public.customer_albums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_images" ON public.customer_images FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
