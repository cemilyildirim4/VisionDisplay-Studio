-- Kabin / Tekli Panel (Modül) tipi — mevcut kurulumlar için belgeleme.
-- product_type sütunu zaten init.sql ve canlı şemada vardır (CABINET | MODULE).
-- Yeni kurulumda ek işlem gerekmez. Eski DB'de yoksa:

ALTER TABLE public.cabins
  ADD COLUMN IF NOT EXISTS product_type character varying(20) DEFAULT 'CABINET';

UPDATE public.cabins
SET product_type = 'CABINET'
WHERE product_type IS NULL OR product_type = '';

COMMENT ON COLUMN public.cabins.product_type IS
  'CABINET = Kabin; MODULE = Tekli Panel (Indoor / Outdoor / Flexible vb.)';
