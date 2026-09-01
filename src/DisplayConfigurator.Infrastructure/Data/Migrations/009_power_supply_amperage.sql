-- Güç kaynağı kataloguna çıkış akımı (Amper) alanı.

ALTER TABLE public.power_supplies
    ADD COLUMN IF NOT EXISTS amperage numeric(8,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.power_supplies.amperage IS 'Çıkış akımı (Amper).';
