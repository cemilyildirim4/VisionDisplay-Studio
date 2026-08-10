-- Table: public.cabins

-- DROP TABLE IF EXISTS public.cabins;

CREATE TABLE IF NOT EXISTS public.cabins
(
    id serial NOT NULL,
    series_id integer,
    model_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    pixel_pitch numeric(4,2) NOT NULL,
    width_mm integer NOT NULL,
    height_mm integer NOT NULL,
    resolution_width integer NOT NULL,
    resolution_height integer NOT NULL,
    weight_kg numeric(5,2),
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_power_watts integer DEFAULT 150,
    avg_power_watts integer DEFAULT 50,
    product_type character varying(20) COLLATE pg_catalog."default" DEFAULT 'CABINET'::character varying,
    default_modules_per_card integer DEFAULT 10,
    CONSTRAINT cabins_pkey PRIMARY KEY (id),
    CONSTRAINT cabins_series_id_fkey FOREIGN KEY (series_id)
        REFERENCES public.series (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.cabins
    OWNER to postgres;


-- Table: public.configurations

-- DROP TABLE IF EXISTS public.configurations;

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
    CONSTRAINT configurations_pkey PRIMARY KEY (id),
    CONSTRAINT configurations_cabin_id_fkey FOREIGN KEY (cabin_id)
        REFERENCES public.cabins (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.configurations
    OWNER to postgres;



-- Table: public.series

-- DROP TABLE IF EXISTS public.series;

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