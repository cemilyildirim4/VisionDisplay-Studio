CREATE TABLE IF NOT EXISTS public.feedback_reports
(
    id serial NOT NULL,
    note text NOT NULL,
    role character varying(20),
    page_url character varying(500),
    user_agent character varying(300),
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_reports_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at
    ON public.feedback_reports USING btree (created_at DESC);
