CREATE INDEX IF NOT EXISTS idx_quotes_user_id
    ON public.quotes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_configurations_cabin_id
    ON public.configurations USING btree (cabin_id);
