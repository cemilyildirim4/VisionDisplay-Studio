-- ============================================================
-- Display Configurator - Veritabani Baslangic Semasi
-- Sira onemli: seri -> kabinler -> yapilandirmalar -> teklifler -> sohbet kayitlari
-- (cabins.series_id ve configurations.cabin_id FK'lari bu sirayi zorunlu kilar)
-- ============================================================

-- Table: public.series

CREATE TABLE IF NOT EXISTS public.series
(
    id serial NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT series_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.series
    OWNER to postgres;


-- Table: public.cabins
-- Alanlar frontend'in (frontend/) beklediği model şekliyle birebir eşleşir.
-- product_type / default_modules_per_card / price alanları ConfigurationsController
-- (PDF/teklif hesaplama) özelliği için korunur.

CREATE TABLE IF NOT EXISTS public.cabins
(
    id serial NOT NULL,
    series_id integer,
    category character varying(20) COLLATE pg_catalog."default" NOT NULL DEFAULT 'led'::character varying,
    model_code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    -- product_type: CABINET (kabin) | MODULE (tekli panel / indoor-outdoor-flexible)
    product_type character varying(20) COLLATE pg_catalog."default" DEFAULT 'CABINET'::character varying,
    default_modules_per_card integer DEFAULT 10,
    price numeric(10,2) NOT NULL DEFAULT 0,
    pixel_pitch_mm numeric(5,2) NOT NULL DEFAULT 0,
    width_mm integer NOT NULL DEFAULT 0,
    height_mm integer NOT NULL DEFAULT 0,
    depth_mm integer NOT NULL DEFAULT 0,
    weight_kg numeric(6,2),
    pixel_width integer NOT NULL DEFAULT 0,
    pixel_height integer NOT NULL DEFAULT 0,
    brightness_nits integer NOT NULL DEFAULT 0,
    refresh_rate_hz integer NOT NULL DEFAULT 0,
    power_typical_watts numeric(8,2) NOT NULL DEFAULT 0,
    power_max_watts numeric(8,2) NOT NULL DEFAULT 0,
    viewing_distance_m numeric(5,2),
    size_inch integer,
    bezel_mm numeric(5,2),
    -- Model seçme ekranı filtreleri (birden fazla değer virgülle ayrılır)
    filter_category character varying(200) COLLATE pg_catalog."default",
    usage character varying(200) COLLATE pg_catalog."default",
    installation character varying(200) COLLATE pg_catalog."default",
    configurable character varying(100) COLLATE pg_catalog."default",
    service character varying(100) COLLATE pg_catalog."default",
    led_type character varying(50) COLLATE pg_catalog."default",
    protection character varying(50) COLLATE pg_catalog."default",
    certification character varying(300) COLLATE pg_catalog."default",
    features character varying(300) COLLATE pg_catalog."default",
    -- IP20/30 iç mekan, IP65+ dış mekan. featured: sihirbaz hedef stok puanı.
    ip_rating integer,
    featured boolean NOT NULL DEFAULT false,
    -- Görsel ve bileşen kodları
    image_url text COLLATE pg_catalog."default",
    sbox_code character varying(50) COLLATE pg_catalog."default",
    jig_code character varying(50) COLLATE pg_catalog."default",
    power_cord_110_code character varying(50) COLLATE pg_catalog."default",
    power_cord_220_code character varying(50) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cabins_pkey PRIMARY KEY (id),
    CONSTRAINT cabins_model_code_key UNIQUE (model_code),
    CONSTRAINT cabins_series_id_fkey FOREIGN KEY (series_id)
        REFERENCES public.series (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.cabins
    OWNER to postgres;


-- Table: public.power_supplies / mini_pcs / patch_cables / receiving_cards / processors
-- Altı ana donanımın beş katalog tablosu (altıncısı cabins).

CREATE TABLE IF NOT EXISTS public.power_supplies
(
    id serial NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    model character varying(100) COLLATE pg_catalog."default",
    price numeric(12,2) NOT NULL DEFAULT 0,
    power_draw_watt numeric(10,2) NOT NULL DEFAULT 0,
    heat_dissipation_btu numeric(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio numeric(6,4) NOT NULL DEFAULT 1.0000,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT power_supplies_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.mini_pcs
(
    id serial NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    model character varying(100) COLLATE pg_catalog."default",
    price numeric(12,2) NOT NULL DEFAULT 0,
    power_draw_watt numeric(10,2) NOT NULL DEFAULT 0,
    heat_dissipation_btu numeric(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio numeric(6,4) NOT NULL DEFAULT 1.0000,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mini_pcs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patch_cables
(
    id serial NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    model character varying(100) COLLATE pg_catalog."default",
    price numeric(12,2) NOT NULL DEFAULT 0,
    power_draw_watt numeric(10,2) NOT NULL DEFAULT 0,
    heat_dissipation_btu numeric(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio numeric(6,4) NOT NULL DEFAULT 1.0000,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patch_cables_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.receiving_cards
(
    id serial NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    model character varying(100) COLLATE pg_catalog."default",
    price numeric(12,2) NOT NULL DEFAULT 0,
    power_draw_watt numeric(10,2) NOT NULL DEFAULT 0,
    heat_dissipation_btu numeric(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio numeric(6,4) NOT NULL DEFAULT 1.0000,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT receiving_cards_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.processors
(
    id serial NOT NULL,
    name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    model character varying(100) COLLATE pg_catalog."default",
    price numeric(12,2) NOT NULL DEFAULT 0,
    power_draw_watt numeric(10,2) NOT NULL DEFAULT 0,
    heat_dissipation_btu numeric(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio numeric(6,4) NOT NULL DEFAULT 1.0000,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processors_pkey PRIMARY KEY (id)
);


-- Table: public.users
-- Bayi/musteri girisi (JWT). Beta asamasinda opsiyoneldir.

CREATE TABLE IF NOT EXISTS public.users
(
    id serial NOT NULL,
    email character varying(150) COLLATE pg_catalog."default" NOT NULL,
    password_hash text COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(150) COLLATE pg_catalog."default",
    role character varying(20) COLLATE pg_catalog."default" NOT NULL DEFAULT 'Dealer'::character varying,
    external_provider character varying(30) COLLATE pg_catalog."default",
    external_id character varying(150) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;


-- Table: public.refresh_tokens
-- JWT erisim jetonu kisa omurlu tutulur; oturumu canli tutan uzun omurlu jeton.

CREATE TABLE IF NOT EXISTS public.refresh_tokens
(
    id serial NOT NULL,
    user_id integer NOT NULL,
    token character varying(200) COLLATE pg_catalog."default" NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    revoked boolean NOT NULL DEFAULT false,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_token_key UNIQUE (token),
    CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.refresh_tokens
    OWNER to postgres;


-- Table: public.invite_codes
-- Beta asamasinda kayit zorunlulugu olmadan erisim saglayan davet kodlari.

CREATE TABLE IF NOT EXISTS public.invite_codes
(
    id serial NOT NULL,
    code character varying(50) COLLATE pg_catalog."default" NOT NULL,
    max_uses integer NOT NULL DEFAULT 1,
    used_count integer NOT NULL DEFAULT 0,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invite_codes_pkey PRIMARY KEY (id),
    CONSTRAINT invite_codes_code_key UNIQUE (code)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.invite_codes
    OWNER to postgres;


-- Table: public.configurations
-- (ConfigurationsController / PDF-teklif hesaplama özelliği için)
-- status/revision/user_id: teklif surec takibi ve bayi girisi icin eklendi.

CREATE TABLE IF NOT EXISTS public.configurations
(
    id serial NOT NULL,
    title character varying(150) COLLATE pg_catalog."default" NOT NULL,
    customer_name character varying(150) COLLATE pg_catalog."default",
    cabin_id integer,
    total_columns integer NOT NULL,
    total_rows integer NOT NULL,
    total_width_mm integer,
    total_height_mm integer,
    total_resolution character varying(50) COLLATE pg_catalog."default",
    total_price numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_weight_kg numeric(10,2) DEFAULT 0,
    total_max_power_kw numeric(10,2) DEFAULT 0,
    total_avg_power_kw numeric(10,2) DEFAULT 0,
    aspect_ratio character varying(20) COLLATE pg_catalog."default" DEFAULT '16:9'::character varying,
    is_full_hd boolean DEFAULT false,
    is_4k boolean DEFAULT false,
    assembly_type character varying(20) COLLATE pg_catalog."default" DEFAULT 'CABINET'::character varying,
    modules_per_card integer DEFAULT 10,
    receiving_card_count integer DEFAULT 0,
    required_rj45_ports integer DEFAULT 1,
    recommended_processor character varying(100) COLLATE pg_catalog."default" DEFAULT 'NovaStar TB40'::character varying,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'Taslak'::character varying,
    revision integer DEFAULT 1,
    user_id integer,
    has_mini_pc boolean NOT NULL DEFAULT false,
    labor_cost_multiplier numeric(8,4) NOT NULL DEFAULT 1.0000,
    power_supply_id integer,
    mini_pc_id integer,
    patch_cable_id integer,
    receiving_card_id integer,
    processor_id integer,
    CONSTRAINT configurations_pkey PRIMARY KEY (id),
    CONSTRAINT configurations_cabin_id_fkey FOREIGN KEY (cabin_id)
        REFERENCES public.cabins (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT configurations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT configurations_power_supply_id_fkey FOREIGN KEY (power_supply_id)
        REFERENCES public.power_supplies (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT configurations_mini_pc_id_fkey FOREIGN KEY (mini_pc_id)
        REFERENCES public.mini_pcs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT configurations_patch_cable_id_fkey FOREIGN KEY (patch_cable_id)
        REFERENCES public.patch_cables (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT configurations_receiving_card_id_fkey FOREIGN KEY (receiving_card_id)
        REFERENCES public.receiving_cards (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT configurations_processor_id_fkey FOREIGN KEY (processor_id)
        REFERENCES public.processors (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.configurations
    OWNER to postgres;


-- Table: public.quotes
-- "PDF olarak dışa aktar" formundan gelen teklif kayıtları.
-- status/revision/admin_note/user_id: teklif surec takibi ve bayi girisi icin eklendi.

CREATE TABLE IF NOT EXISTS public.quotes
(
    id serial NOT NULL,
    customer_name character varying(150) COLLATE pg_catalog."default",
    phone character varying(50) COLLATE pg_catalog."default",
    email character varying(150) COLLATE pg_catalog."default",
    address text COLLATE pg_catalog."default",
    message text COLLATE pg_catalog."default",
    model_code character varying(100) COLLATE pg_catalog."default",
    wall_width_m numeric(6,2),
    wall_height_m numeric(6,2),
    screen_mode character varying(20) COLLATE pg_catalog."default",
    "columns" integer,
    "rows" integer,
    screen_type character varying(20) COLLATE pg_catalog."default",
    resolution character varying(10) COLLATE pg_catalog."default",
    screens_summary text COLLATE pg_catalog."default",
    -- Tasarımın tamamı (JSON): "Tekliflerim → Düzenle" bunu geri yükler.
    -- Yalnızca özet alanları tasarımı geri açmaya yetmiyordu; çoklu ekran
    -- düzeni screens_summary'de yalnızca okunur bir cümle olarak duruyor.
    config_json text COLLATE pg_catalog."default",
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'Beklemede'::character varying,
    revision integer DEFAULT 1,
    admin_note text COLLATE pg_catalog."default",
    user_id integer,
    has_mini_pc boolean NOT NULL DEFAULT false,
    labor_cost_multiplier numeric(8,4) NOT NULL DEFAULT 1.0000,
    cabin_id integer,
    power_supply_id integer,
    mini_pc_id integer,
    patch_cable_id integer,
    receiving_card_id integer,
    processor_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quotes_pkey PRIMARY KEY (id),
    CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_cabin_id_fkey FOREIGN KEY (cabin_id)
        REFERENCES public.cabins (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_power_supply_id_fkey FOREIGN KEY (power_supply_id)
        REFERENCES public.power_supplies (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_mini_pc_id_fkey FOREIGN KEY (mini_pc_id)
        REFERENCES public.mini_pcs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_patch_cable_id_fkey FOREIGN KEY (patch_cable_id)
        REFERENCES public.patch_cables (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_receiving_card_id_fkey FOREIGN KEY (receiving_card_id)
        REFERENCES public.receiving_cards (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT quotes_processor_id_fkey FOREIGN KEY (processor_id)
        REFERENCES public.processors (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.quotes
    OWNER to postgres;

CREATE INDEX IF NOT EXISTS idx_quotes_user_id
    ON public.quotes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_quotes_cabin_id
    ON public.quotes USING btree (cabin_id);

CREATE INDEX IF NOT EXISTS idx_quotes_power_supply_id
    ON public.quotes USING btree (power_supply_id);

CREATE INDEX IF NOT EXISTS idx_quotes_mini_pc_id
    ON public.quotes USING btree (mini_pc_id);

CREATE INDEX IF NOT EXISTS idx_quotes_patch_cable_id
    ON public.quotes USING btree (patch_cable_id);

CREATE INDEX IF NOT EXISTS idx_quotes_receiving_card_id
    ON public.quotes USING btree (receiving_card_id);

CREATE INDEX IF NOT EXISTS idx_quotes_processor_id
    ON public.quotes USING btree (processor_id);

CREATE INDEX IF NOT EXISTS idx_configurations_cabin_id
    ON public.configurations USING btree (cabin_id);

CREATE INDEX IF NOT EXISTS idx_configurations_power_supply_id
    ON public.configurations USING btree (power_supply_id);

CREATE INDEX IF NOT EXISTS idx_configurations_mini_pc_id
    ON public.configurations USING btree (mini_pc_id);

CREATE INDEX IF NOT EXISTS idx_configurations_patch_cable_id
    ON public.configurations USING btree (patch_cable_id);

CREATE INDEX IF NOT EXISTS idx_configurations_receiving_card_id
    ON public.configurations USING btree (receiving_card_id);

CREATE INDEX IF NOT EXISTS idx_configurations_processor_id
    ON public.configurations USING btree (processor_id);


-- Table: public.system_settings
-- Sistem geneli ayarlar. labor_cost_multiplier: işçilik ($USD/m²).

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


-- Table: public.chat_logs
-- Sohbet yardımcısına sorulan sorular - cevaplanamayanlar bilgi tabanı için önemli.

CREATE TABLE IF NOT EXISTS public.chat_logs
(
    id serial NOT NULL,
    question character varying(500) COLLATE pg_catalog."default" NOT NULL,
    topic_id character varying(50) COLLATE pg_catalog."default",
    answered boolean NOT NULL DEFAULT false,
    lang character varying(5) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_logs_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.chat_logs
    OWNER to postgres;


-- ============================================================
-- Başlangıç verisi (SEED) — frontend'deki (App.jsx SAMPLE_CABINETS) demo
-- modellerin birebir aynısı. Kabin standardı: 320 x 160 x 100 mm.
-- ============================================================

INSERT INTO public.series (id, name, description)
VALUES
    (1, 'LED İç Mekan (Duvar)', 'İç mekan LED tabela serisi'),
    (2, 'Video Duvarı', 'Video duvarı panel serisi')
ON CONFLICT (id) DO NOTHING;

SELECT setval('series_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.series));

INSERT INTO public.cabins
    (id, series_id, category, model_code, pixel_pitch_mm, width_mm, height_mm, depth_mm, weight_kg,
     pixel_width, pixel_height, brightness_nits, refresh_rate_hz, power_typical_watts, power_max_watts,
     viewing_distance_m, filter_category, usage, installation, configurable, service, led_type,
     protection, certification, features, sbox_code, jig_code, power_cord_110_code, power_cord_220_code)
VALUES
    (1, 1, 'led', 'DEMO-P1.25', 1.25, 320, 160, 100, 1.6,
     256, 128, 800, 3840, 11, 32,
     3.1, 'Kapalı,Duvar', 'Ticari İç Mekan', 'Düz,İçbükey,Dışbükey,İç L Tipi', 'Dolap', 'Ön', 'CoB',
     'CoB', 'EMC B Sınıfı,TÜV Göz Konforu,Yangın Yönetmeliği', 'LED HDR,HDR 10/10+', 'SBX-100', 'JIG-A1', 'PC-110-STD', 'PC-220-STD'),
    (2, 1, 'led', 'DEMO-P1.6', 1.6, 320, 160, 100, 1.6,
     200, 100, 700, 3840, 10, 30,
     4.0, 'Duvar', 'Ticari İç Mekan,Sinema', 'Düz,İçbükey', 'Dolap', 'Ön,Arka', 'SMD',
     'Ağız', 'EMC B Sınıfı,Deprem Testi', 'LED HDR,Güç Yedekliliği', 'SBX-100', 'JIG-A1', 'PC-110-STD', 'PC-220-STD'),
    (3, 1, 'led', 'DEMO-P2.0', 2.0, 320, 160, 100, 1.5,
     160, 80, 600, 3840, 9, 28,
     5.0, 'Duvar', 'Ticari İç Mekan,Pencereye bakan', 'Düz,İstifleme,Asılı', 'Hepsi Bir Arada', 'Arka', 'MIP',
     'Ağız', 'EMC B Sınıfı', 'SmartThings Pro', 'SBX-200', 'JIG-B2', 'PC-110-STD', 'PC-220-STD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cabins
    (id, series_id, category, model_code, pixel_pitch_mm, width_mm, height_mm, depth_mm, weight_kg,
     pixel_width, pixel_height, brightness_nits, refresh_rate_hz, power_typical_watts, power_max_watts,
     viewing_distance_m, size_inch, bezel_mm)
VALUES
    (11, 2, 'videowall', 'VW-55-088', 0.63, 1210, 680, 70, 22,
     1920, 1080, 500, 3840, 120, 180,
     3.0, 55, 0.88),
    (12, 2, 'videowall', 'VW-55-174', 0.63, 1210, 680, 70, 21,
     1920, 1080, 700, 3840, 130, 190,
     3.0, 55, 1.74)
ON CONFLICT (id) DO NOTHING;

SELECT setval('cabins_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.cabins));

-- =====================================================================
-- Table: public.feedback_reports
-- Test/beta kullanıcılarının gönderdiği hata ve geri bildirim notları.
--
-- NEDEN: Bildirim formu vardı ama not hiçbir yere kaydedilmiyor, yalnızca
-- tarayıcı konsoluna yazılıyordu — yani kimse göremiyordu. Notlar artık
-- burada tutuluyor ve yönetim panelinden okunuyor.
--
-- Ortam bilgisi (sayfa adresi, tarayıcı) hatayı tekrar üretebilmek için
-- gerekli; kişisel veri saklanmaz.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.feedback_reports
(
    id serial NOT NULL,
    note text COLLATE pg_catalog."default" NOT NULL,
    role character varying(20) COLLATE pg_catalog."default",
    page_url character varying(500) COLLATE pg_catalog."default",
    user_agent character varying(300) COLLATE pg_catalog."default",
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_reports_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.feedback_reports
    OWNER to postgres;

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at
    ON public.feedback_reports USING btree (created_at DESC);
