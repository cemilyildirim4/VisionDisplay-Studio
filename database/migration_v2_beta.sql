-- ============================================================
-- MEVCUT (zaten calisan) veritabaninizi guncellemek icin.
--
-- init.sql yalnizca veritabani KONTEYNERI ILK KEZ olusturulurken
-- (docker volume bossa) otomatik calisir. Sizin postgres_data volume'unuz
-- zaten dolu oldugu icin yeni tablo/sutunlari almak icin bu dosyayi ELLE
-- calistirmaniz gerekiyor. Butun komutlar "IF NOT EXISTS" ile yazildigi
-- icin birden fazla kez calistirmak veya bunu zaten init.sql'i icermis bir
-- veritabaninda calistirmak GUVENLIDIR (hicbir veri kaybi olmaz).
--
-- Nasil calistirilir (proje kok dizininden):
--   docker compose exec -T postgres psql -U postgres -d display_configurator_db < database/migration_v2_beta.sql
--
-- ya da pgAdmin'de bu dosyanin icerigini Query Tool'a yapistirip calistirin.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users
(
    id serial NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    display_name character varying(150),
    role character varying(20) NOT NULL DEFAULT 'Dealer',
    external_provider character varying(30),
    external_id character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.refresh_tokens
(
    id serial NOT NULL,
    user_id integer NOT NULL,
    token character varying(200) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    revoked boolean NOT NULL DEFAULT false,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_token_key UNIQUE (token),
    CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.invite_codes
(
    id serial NOT NULL,
    code character varying(50) NOT NULL,
    max_uses integer NOT NULL DEFAULT 1,
    used_count integer NOT NULL DEFAULT 0,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invite_codes_pkey PRIMARY KEY (id),
    CONSTRAINT invite_codes_code_key UNIQUE (code)
);

ALTER TABLE public.configurations ADD COLUMN IF NOT EXISTS status character varying(20) DEFAULT 'Taslak';
ALTER TABLE public.configurations ADD COLUMN IF NOT EXISTS revision integer DEFAULT 1;
ALTER TABLE public.configurations ADD COLUMN IF NOT EXISTS user_id integer;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'configurations_user_id_fkey'
    ) THEN
        ALTER TABLE public.configurations
            ADD CONSTRAINT configurations_user_id_fkey FOREIGN KEY (user_id)
            REFERENCES public.users (id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status character varying(20) DEFAULT 'Beklemede';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS revision integer DEFAULT 1;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS user_id integer;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'quotes_user_id_fkey'
    ) THEN
        ALTER TABLE public.quotes
            ADD CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id)
            REFERENCES public.users (id) ON DELETE SET NULL;
    END IF;
END $$;

-- Var olan tum kayitlara mantikli bir varsayilan durum ata (NULL kalmasinlar).
UPDATE public.configurations SET status = 'Onaylandı' WHERE status IS NULL;
UPDATE public.quotes SET status = 'Beklemede' WHERE status IS NULL;
