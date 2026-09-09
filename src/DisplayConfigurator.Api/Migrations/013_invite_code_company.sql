-- Davet koduna FIRMA BILGILERI eklendi.
--
-- Kod uretilirken firma adi, telefon, e-posta ve kisa not bir kez giriliyor.
-- Boylece bayi her PDF oncesi ayni bilgileri elle yazmiyor; giriste oturuma
-- tasiniyor ve teklif/rapor bunlarla dolduruluyor.

ALTER TABLE public.invite_codes
    ADD COLUMN IF NOT EXISTS company_name character varying(200),
    ADD COLUMN IF NOT EXISTS phone character varying(50),
    ADD COLUMN IF NOT EXISTS email character varying(200),
    ADD COLUMN IF NOT EXISTS note text;
