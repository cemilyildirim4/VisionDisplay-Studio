-- Kayıtlı projelere teklifteki müşteri iletişim + duvar/düzen alanları.
-- Teklifler zaten phone/email tutuyor; configurations yalnızca customer_name vardı.

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS phone character varying(50);

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS email character varying(150);

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS wall_width_m numeric(6,2);

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS wall_height_m numeric(6,2);

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS screen_mode character varying(20);

COMMENT ON COLUMN public.configurations.phone IS 'Müşteri telefonu (teklif formu ile aynı).';
COMMENT ON COLUMN public.configurations.email IS 'Müşteri e-posta (teklif formu ile aynı; yoksa hesap e-postası doldurulur).';
COMMENT ON COLUMN public.configurations.wall_width_m IS 'Duvar genişliği (m).';
COMMENT ON COLUMN public.configurations.wall_height_m IS 'Duvar yüksekliği (m).';
COMMENT ON COLUMN public.configurations.screen_mode IS 'single | multi';
