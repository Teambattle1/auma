-- AUMA Kundekartotek - Database Setup
-- Kør dette i Supabase SQL Editor: https://supabase.com/dashboard/project/jxyzrkrfbkrsdkmjqxwy/sql/new

-- Kunde tabel
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Firmadata
  firma_navn TEXT NOT NULL DEFAULT '',
  cvr_nummer TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  postnummer TEXT DEFAULT '',
  by_navn TEXT DEFAULT '',
  land TEXT DEFAULT 'Danmark',
  -- Kontaktperson
  kontaktperson TEXT DEFAULT '',
  titel TEXT DEFAULT '',
  telefon TEXT DEFAULT '',
  mobil TEXT DEFAULT '',
  email TEXT DEFAULT '',
  -- Økonomi
  betalingsbetingelser TEXT DEFAULT '',
  kredit_limit NUMERIC DEFAULT 0,
  -- Noter
  noter TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kunde billeder tabel
CREATE TABLE IF NOT EXISTS public.customer_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_images ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
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

-- Storage bucket for kunde billeder
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-images', 'customer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public upload to customer-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer-images');
CREATE POLICY "Allow public read from customer-images" ON storage.objects FOR SELECT USING (bucket_id = 'customer-images');
CREATE POLICY "Allow public delete from customer-images" ON storage.objects FOR DELETE USING (bucket_id = 'customer-images');
