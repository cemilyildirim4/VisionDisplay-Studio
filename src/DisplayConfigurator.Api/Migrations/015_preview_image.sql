-- Yapılandırma tuvalinin anlık görüntüsü.
-- Liste sorgularına eklenmez; PDF yeniden üretilirken ayrıca okunur.
-- Eski kayıtlarda NULL kalır, rapor o zaman ızgara çizimine düşer.

ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS preview_image bytea;

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS preview_image bytea;
