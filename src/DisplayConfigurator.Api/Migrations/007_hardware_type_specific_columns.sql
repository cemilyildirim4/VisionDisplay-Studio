-- Donanım katalog tablolarını tipe özel parametrelere ayırır.
-- Ortak anlamsız alanlar (kabloda watt/verim, PSU'da çekiş watt vb.) kalkar.
-- LED modül (cabins) için görünen ad (name) eklenir.

-- ------------------------------------------------------------
-- Güç kaynağı: gerilim, maks. çıkış, verim, BTU
-- ------------------------------------------------------------
ALTER TABLE public.power_supplies
    ADD COLUMN IF NOT EXISTS output_voltage numeric(8,2) NOT NULL DEFAULT 0;
ALTER TABLE public.power_supplies
    ADD COLUMN IF NOT EXISTS max_power_output_watt numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.power_supplies DROP COLUMN IF EXISTS power_draw_watt;

-- ------------------------------------------------------------
-- Mini PC: CPU/RAM, depolama, OS, çözünürlük, güç çekişi
-- ------------------------------------------------------------
ALTER TABLE public.mini_pcs
    ADD COLUMN IF NOT EXISTS cpu_ram_info character varying(200);
ALTER TABLE public.mini_pcs
    ADD COLUMN IF NOT EXISTS storage character varying(120);
ALTER TABLE public.mini_pcs
    ADD COLUMN IF NOT EXISTS operating_system character varying(80);
ALTER TABLE public.mini_pcs
    ADD COLUMN IF NOT EXISTS max_supported_resolution character varying(40);

ALTER TABLE public.mini_pcs DROP COLUMN IF EXISTS heat_dissipation_btu;
ALTER TABLE public.mini_pcs DROP COLUMN IF EXISTS efficiency_ratio;

-- ------------------------------------------------------------
-- Patch kablosu: tip, uzunluk, konektör (watt/verim/ısı yok)
-- ------------------------------------------------------------
ALTER TABLE public.patch_cables
    ADD COLUMN IF NOT EXISTS cable_type character varying(80);
ALTER TABLE public.patch_cables
    ADD COLUMN IF NOT EXISTS length_meters numeric(8,2) NOT NULL DEFAULT 0;
ALTER TABLE public.patch_cables
    ADD COLUMN IF NOT EXISTS connector_type character varying(80);

ALTER TABLE public.patch_cables DROP COLUMN IF EXISTS power_draw_watt;
ALTER TABLE public.patch_cables DROP COLUMN IF EXISTS heat_dissipation_btu;
ALTER TABLE public.patch_cables DROP COLUMN IF EXISTS efficiency_ratio;

-- ------------------------------------------------------------
-- Alıcı kart: piksel kapasitesi, hub port, güç çekişi
-- ------------------------------------------------------------
ALTER TABLE public.receiving_cards
    ADD COLUMN IF NOT EXISTS max_pixel_width integer NOT NULL DEFAULT 0;
ALTER TABLE public.receiving_cards
    ADD COLUMN IF NOT EXISTS max_pixel_height integer NOT NULL DEFAULT 0;
ALTER TABLE public.receiving_cards
    ADD COLUMN IF NOT EXISTS hub_port_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.receiving_cards DROP COLUMN IF EXISTS heat_dissipation_btu;
ALTER TABLE public.receiving_cards DROP COLUMN IF EXISTS efficiency_ratio;

-- ------------------------------------------------------------
-- İşlemci: milyon piksel, ethernet, giriş portları, güç çekişi
-- ------------------------------------------------------------
ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS max_pixel_capacity_mpx numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS ethernet_port_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS input_ports_info character varying(250);

ALTER TABLE public.processors DROP COLUMN IF EXISTS heat_dissipation_btu;
ALTER TABLE public.processors DROP COLUMN IF EXISTS efficiency_ratio;

-- ------------------------------------------------------------
-- LED modül (cabins): görünen ad
-- ------------------------------------------------------------
ALTER TABLE public.cabins
    ADD COLUMN IF NOT EXISTS name character varying(150);

COMMENT ON COLUMN public.power_supplies.output_voltage IS 'Çıkış gerilimi (V).';
COMMENT ON COLUMN public.power_supplies.max_power_output_watt IS 'Maksimum çıkış gücü (W).';
COMMENT ON COLUMN public.mini_pcs.cpu_ram_info IS 'İşlemci / RAM özeti.';
COMMENT ON COLUMN public.patch_cables.cable_type IS 'Kablo tipi (Cat6, PowerCON vb.).';
COMMENT ON COLUMN public.receiving_cards.max_pixel_width IS 'Maks. piksel genişliği.';
COMMENT ON COLUMN public.processors.max_pixel_capacity_mpx IS 'Maks. piksel kapasitesi (milyon).';
COMMENT ON COLUMN public.cabins.name IS 'Katalog görünen adı; boşsa model_code kullanılır.';
