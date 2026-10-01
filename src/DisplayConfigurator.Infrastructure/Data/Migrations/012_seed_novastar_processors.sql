-- NovaStar işlemci kataloğu: model koduna göre ekle veya güncelle (çift kayıt yok).

WITH src(name, model, price, ports, inputs, watt) AS (
    VALUES
        ('NovaStar TB40',   'TB40',     350.00::numeric,  2, 'HDMI 1.4 x1, USB 3.0 x1',                    18.00::numeric),
        ('NovaStar TB60',   'TB60',     530.00::numeric,  4, 'HDMI 1.4 x1, USB 3.0 x1, USB 2.0 x2',        18.00::numeric),
        ('NovaStar VX400',  'VX400',    675.00::numeric,  4, 'HDMI 1.3 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar VX600',  'VX600',    925.00::numeric,  6, 'HDMI 1.3 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar VX1000', 'VX1000',  1325.00::numeric, 10, 'HDMI 1.4 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar MCTRL4K','MCTRL4K', 3500.00::numeric, 16, 'DP 1.2 x1, HDMI 2.0 x1, Dual-Link DVI x2',   30.00::numeric)
)
UPDATE public.processors p
SET
    name = s.name,
    price = s.price,
    max_pixel_capacity_per_port = 650000,
    ethernet_port_count = s.ports,
    input_ports_info = s.inputs,
    power_draw_watt = s.watt,
    is_active = true
FROM src s
WHERE lower(coalesce(p.model, '')) = lower(s.model);

INSERT INTO public.processors
    (name, model, price, is_active, max_pixel_capacity_per_port, max_port_width, max_port_height,
     ethernet_port_count, input_ports_info, power_draw_watt)
SELECT
    s.name, s.model, s.price, true, 650000, 4096, 4096, s.ports, s.inputs, s.watt
FROM (
    VALUES
        ('NovaStar TB40',   'TB40',     350.00::numeric,  2, 'HDMI 1.4 x1, USB 3.0 x1',                    18.00::numeric),
        ('NovaStar TB60',   'TB60',     530.00::numeric,  4, 'HDMI 1.4 x1, USB 3.0 x1, USB 2.0 x2',        18.00::numeric),
        ('NovaStar VX400',  'VX400',    675.00::numeric,  4, 'HDMI 1.3 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar VX600',  'VX600',    925.00::numeric,  6, 'HDMI 1.3 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar VX1000', 'VX1000',  1325.00::numeric, 10, 'HDMI 1.4 x2, DVI x1, 3G-SDI x1',             28.00::numeric),
        ('NovaStar MCTRL4K','MCTRL4K', 3500.00::numeric, 16, 'DP 1.2 x1, HDMI 2.0 x1, Dual-Link DVI x2',   30.00::numeric)
) AS s(name, model, price, ports, inputs, watt)
WHERE NOT EXISTS (
    SELECT 1 FROM public.processors p
    WHERE lower(coalesce(p.model, '')) = lower(s.model)
);
