-- INDIRME KAYITLARI.
--
-- CSV/Excel indirmesi tamamen tarayicida uretiliyordu; sunucu bu isten
-- haberdar olmadigi icin panelde "kim ne indirdi" gorunmuyordu. Bu tablo
-- yalnizca olayin kendisini tutuyor: kim, hangi model, hangi bicim, ne zaman.

CREATE TABLE IF NOT EXISTS public.export_logs
(
    id serial NOT NULL,
    user_id integer,
    user_name character varying(200),
    company_name character varying(200),
    model_code character varying(100),
    kind character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT export_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_export_logs_created_at ON public.export_logs (created_at DESC);
