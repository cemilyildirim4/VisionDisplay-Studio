ALTER TABLE configurations
    ADD COLUMN IF NOT EXISTS connection_type varchar(20) NOT NULL DEFAULT 'loop';
