-- Davet kodlarina KULLANICI ADI eklendi.
--
-- Kod tek basina kimin girdigini soylemiyordu; birden cok kullanimi olan bir
-- kodda kimin girdigi de takip edilemiyordu. Artik kod uretilirken bir
-- kullanici adi veriliyor ve giris icin ikisi birden gerekiyor.
-- Eski kayitlarda alan bos kalir; bos oldugunda yalnizca kod sorulur.

ALTER TABLE public.invite_codes
    ADD COLUMN IF NOT EXISTS user_name character varying(100);
