-- Altı ana donanım bileşeni + işçilik çarpanı.
--
-- Kabin (cabins) zaten vardı. Bu betik güç kaynağı, mini PC, patch kablosu,
-- alıcı kart ve işlemci katalog tablolarını ekler; ardından configurations
-- ve quotes kayıtlarına HasMiniPc, LaborCostMultiplier ve 6 donanım FK'sını
-- bağlar (quotes tarafında cabin_id de ilk kez eklenir).
--
-- IF NOT EXISTS / pg_constraint kontrolü: SqlMigrationRunner tekrar
-- çalıştırsa bile güvenli.

-- ------------------------------------------------------------
-- Katalog tabloları
-- ------------------------------------------------------------

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

COMMENT ON TABLE public.power_supplies IS 'Güç kaynağı katalog kayıtları.';
COMMENT ON TABLE public.mini_pcs IS 'Mini PC katalog kayıtları.';
COMMENT ON TABLE public.patch_cables IS 'Patch kablosu katalog kayıtları.';
COMMENT ON TABLE public.receiving_cards IS 'Alıcı kart katalog kayıtları.';
COMMENT ON TABLE public.processors IS 'İşlemci / gönderici kart katalog kayıtları.';

-- ------------------------------------------------------------
-- configurations: HasMiniPc, işçilik çarpanı, 5 yeni donanım FK
-- (cabin_id zaten var)
-- ------------------------------------------------------------

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS has_mini_pc boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS labor_cost_multiplier numeric(8,4) NOT NULL DEFAULT 1.0000;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS power_supply_id integer;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS mini_pc_id integer;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS patch_cable_id integer;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS receiving_card_id integer;

ALTER TABLE IF EXISTS public.configurations
    ADD COLUMN IF NOT EXISTS processor_id integer;

COMMENT ON COLUMN public.configurations.has_mini_pc IS 'Yapılandırmaya mini PC dahil mi.';
COMMENT ON COLUMN public.configurations.labor_cost_multiplier IS 'İşçilik maliyeti çarpanı (1.00 = standart).';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_power_supply_id_fkey') THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_power_supply_id_fkey
            FOREIGN KEY (power_supply_id) REFERENCES public.power_supplies (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_mini_pc_id_fkey') THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_mini_pc_id_fkey
            FOREIGN KEY (mini_pc_id) REFERENCES public.mini_pcs (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_patch_cable_id_fkey') THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_patch_cable_id_fkey
            FOREIGN KEY (patch_cable_id) REFERENCES public.patch_cables (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_receiving_card_id_fkey') THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_receiving_card_id_fkey
            FOREIGN KEY (receiving_card_id) REFERENCES public.receiving_cards (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_processor_id_fkey') THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_processor_id_fkey
            FOREIGN KEY (processor_id) REFERENCES public.processors (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

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

-- ------------------------------------------------------------
-- quotes: HasMiniPc, işçilik çarpanı, 6 donanım FK (cabin dahil)
-- ------------------------------------------------------------

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS has_mini_pc boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS labor_cost_multiplier numeric(8,4) NOT NULL DEFAULT 1.0000;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS cabin_id integer;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS power_supply_id integer;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS mini_pc_id integer;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS patch_cable_id integer;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS receiving_card_id integer;

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS processor_id integer;

COMMENT ON COLUMN public.quotes.has_mini_pc IS 'Teklife mini PC dahil mi.';
COMMENT ON COLUMN public.quotes.labor_cost_multiplier IS 'İşçilik maliyeti çarpanı (1.00 = standart).';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_cabin_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_cabin_id_fkey
            FOREIGN KEY (cabin_id) REFERENCES public.cabins (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_power_supply_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_power_supply_id_fkey
            FOREIGN KEY (power_supply_id) REFERENCES public.power_supplies (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_mini_pc_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_mini_pc_id_fkey
            FOREIGN KEY (mini_pc_id) REFERENCES public.mini_pcs (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_patch_cable_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_patch_cable_id_fkey
            FOREIGN KEY (patch_cable_id) REFERENCES public.patch_cables (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_receiving_card_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_receiving_card_id_fkey
            FOREIGN KEY (receiving_card_id) REFERENCES public.receiving_cards (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_processor_id_fkey') THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_processor_id_fkey
            FOREIGN KEY (processor_id) REFERENCES public.processors (id)
            ON UPDATE NO ACTION ON DELETE SET NULL;
    END IF;
END $$;

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
