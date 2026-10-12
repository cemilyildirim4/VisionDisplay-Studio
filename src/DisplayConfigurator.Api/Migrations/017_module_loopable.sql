ALTER TABLE cabins
    ADD COLUMN IF NOT EXISTS is_loopable boolean;

UPDATE cabins
SET is_loopable = TRUE
WHERE UPPER(product_type) = 'MODULE'
  AND UPPER(model_code) IN ('550011524A', '550012949A', 'Q30H15B13V3');
