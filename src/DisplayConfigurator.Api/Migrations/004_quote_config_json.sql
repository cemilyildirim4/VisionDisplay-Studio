-- Teklife tasarımın TAMAMINI sakla.
--
-- Teklif kaydında yalnızca özet vardı: model kodu, duvar ölçüsü, toplam
-- sütun/satır ve "screens_summary" adında okunur bir cümle. Bu özetle teklif
-- ekranda gösterilebiliyor ama tasarım GERİ AÇILAMIYORDU — özellikle çoklu
-- ekran düzeni makineye geri verilemiyordu.
--
-- Bu sütun "Tekliflerim → Düzenle"nin tasarımı birebir açmasını sağlar.
-- Sütun eklenmeden ÖNCEKİ tekliflerde NULL kalır; onlar yalnızca özet
-- alanlarından, eksik biçimde açılabilir.

ALTER TABLE IF EXISTS public.quotes
    ADD COLUMN IF NOT EXISTS config_json text;

COMMENT ON COLUMN public.quotes.config_json IS
    'Teklif anındaki tasarımın tamamı (JSON). "Düzenle" ile birebir geri yüklenir.';
