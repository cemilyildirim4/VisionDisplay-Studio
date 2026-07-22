CREATE TABLE IF NOT EXISTS series (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cabins (
    id SERIAL PRIMARY KEY,
    series_id INT REFERENCES series(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    pixel_pitch NUMERIC(4,2) NOT NULL,
    width_mm INT NOT NULL,
    height_mm INT NOT NULL,
    resolution_width INT NOT NULL,
    resolution_height INT NOT NULL,
    weight_kg NUMERIC(5,2),
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    cabin_id INT REFERENCES cabins(id),
    total_columns INT NOT NULL,
    total_rows INT NOT NULL,
    total_width_mm INT NOT NULL,
    total_height_mm INT NOT NULL,
    total_resolution VARCHAR(50),
    total_price NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO series (name, description) VALUES
('Indoor Standard', 'İç mekan sabit LED ekran serisi'),
('Outdoor Rental', 'Dış mekan kiralanabilir, hafif alüminyum kasa serisi'),
('Fine Pitch', 'Yüksek çözünürlüklü iç mekan kontrol odası serisi');

INSERT INTO cabins (series_id, model_name, pixel_pitch, width_mm, height_mm, resolution_width, resolution_height, weight_kg, price) VALUES
(1, 'IS-P2.5-500x500', 2.50, 500, 500, 200, 200, 6.80, 450.00),
(1, 'IS-P3.07-500x1000', 3.07, 500, 1000, 162, 325, 11.50, 620.00),
(2, 'OR-P3.91-500x500', 3.91, 500, 500, 128, 128, 7.50, 520.00),
(3, 'FP-P1.25-600x337.5', 1.25, 600, 337, 480, 270, 5.20, 1100.00);
