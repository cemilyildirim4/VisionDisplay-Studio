ALTER TABLE public.cabins
    ADD COLUMN IF NOT EXISTS ip_rating integer,
    ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
