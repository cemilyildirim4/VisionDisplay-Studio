-- Sistem geneli ayarlar (işçilik çarpanı $USD/m² vb.).
-- Tek satır/anahtar; IF NOT EXISTS + ON CONFLICT ile tekrar çalıştırılabilir.

CREATE TABLE IF NOT EXISTS public.system_settings
(
    key character varying(100) COLLATE pg_catalog."default" NOT NULL,
    value text COLLATE pg_catalog."default" NOT NULL,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

INSERT INTO public.system_settings (key, value)
VALUES ('labor_cost_multiplier', '1.0000')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_settings IS 'Sistem geneli ayarlar. labor_cost_multiplier: işçilik ($USD/m²).';
COMMENT ON COLUMN public.system_settings.value IS 'Ayar değeri (metin; sayısal ayarlar parse edilir).';
