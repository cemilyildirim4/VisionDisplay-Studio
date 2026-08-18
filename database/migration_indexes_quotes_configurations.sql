-- quotes.user_id ve configurations.cabin_id sorguları (mine listesi, model silme
-- öncesi COUNT, JOIN) seq-scan yerine B-Tree indeks kullansın.
-- Mevcut volume'larda init.sql yeniden çalışmaz; bu betik IF NOT EXISTS ile güvenlidir.

CREATE INDEX IF NOT EXISTS idx_quotes_user_id
    ON public.quotes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_configurations_cabin_id
    ON public.configurations USING btree (cabin_id);
