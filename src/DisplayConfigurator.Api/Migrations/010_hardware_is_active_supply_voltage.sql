-- Donanım kataloğunda aktif/pasif ve modül besleme gerilimi.
-- Eşleştirme motoru yalnızca is_active = true kayıtları kullanır.

ALTER TABLE public.power_supplies
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.mini_pcs
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.patch_cables
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.receiving_cards
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.processors
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.cabins
    ADD COLUMN IF NOT EXISTS supply_voltage numeric(8,2);

COMMENT ON COLUMN public.power_supplies.is_active IS 'Pasif kayıtlar otomatik donanım eşleştirmesine girmez.';
COMMENT ON COLUMN public.cabins.supply_voltage IS 'Modül/kabin besleme gerilimi (V); PSU seçiminde kullanılır.';
