-- İşlemci kapasitesi: toplam Mpx → port başı piksel + port genişlik/yükseklik tavanı.

ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS max_pixel_capacity_per_port integer NOT NULL DEFAULT 650000;

ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS max_port_width integer NOT NULL DEFAULT 4096;

ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS max_port_height integer NOT NULL DEFAULT 4096;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'processors'
          AND column_name = 'max_pixel_capacity_mpx'
    ) THEN
        UPDATE public.processors
        SET max_pixel_capacity_per_port = GREATEST(
            1,
            ROUND(
                CASE
                    WHEN ethernet_port_count > 0
                        THEN max_pixel_capacity_mpx * 1000000.0 / ethernet_port_count
                    ELSE max_pixel_capacity_mpx * 1000000.0
                END
            )::numeric
        )::integer
        WHERE max_pixel_capacity_mpx > 0;

        ALTER TABLE public.processors DROP COLUMN max_pixel_capacity_mpx;
    END IF;
END $$;

COMMENT ON COLUMN public.processors.max_pixel_capacity_per_port IS 'Bir Ethernet portunun taşıyabileceği maksimum piksel.';
COMMENT ON COLUMN public.processors.max_port_width IS 'Bir portun maksimum yatay çözünürlüğü (px).';
COMMENT ON COLUMN public.processors.max_port_height IS 'Bir portun maksimum dikey çözünürlüğü (px).';
