# Canlıya çıkış öncesi kontrol listesi (Adım 5)

## Sırlar ve ortam
- [ ] `.env` git'te yok (`.gitignore` doğrulandı)
- [ ] `JWT_SECRET` en az 32 karakter, rastgele (`openssl rand -base64 48`)
- [ ] `DB_PASSWORD` güçlü ve varsayılan (`postgrespassword`) değil
- [ ] `ASPNETCORE_ENVIRONMENT=Production`
- [ ] `CORS_ORIGINS` tam origin listesi (`https://ornek.com`) — `*` yok
- [ ] `BETA_ENABLED=false` (PII teklif POST kapalı)
- [ ] `VITE_API_URL` boş (nginx `/api` aynı origin) veya `https://ornek.com`
- [ ] SMTP / Google client secret'lar yalnızca .env'de

## TLS
- [ ] Let's Encrypt (veya eşdeğeri) sertifika alındı
- [ ] `SSL_CERT_DIR` `fullchain.pem` + `privkey.pem` içeriyor
- [ ] `privkey.pem` konteyner uid 101 tarafından okunabiliyor (gerekirse kopya + `chown 101:101`)
- [ ] HTTP 80 → HTTPS 301
- [ ] Yanıtta `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] TLS 1.2+ (ssllabs / `openssl s_client`)

## Docker / ağ
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
- [ ] Postgres `5432` ve pgAdmin host'a açık değil
- [ ] API host'a açık değil (yalnızca nginx → `api:8080`)
- [ ] `docker inspect` ile `User` 1654 (api) / 101 (frontend)
- [ ] `GET https://ornek.com/healthz` → 200 ve gövde `Healthy`
- [ ] Postgres down iken `/healthz` → 503

## Veritabanı
- [ ] İlk kurulum: `database/init.sql` volume boşken çalıştı
- [ ] API logunda `Migration uygulandı: 001_...` / zaten uygulanmış
- [ ] `SELECT * FROM schema_migrations;` dolu
- [ ] `idx_quotes_user_id` ve `idx_configurations_cabin_id` var
- [ ] İlk Admin: `#yonetim` bootstrap veya `POST /api/users/bootstrap-admin` (hemen sonra)

## Uygulama duman testi
- [ ] HTTPS ana sayfa açılıyor (karma içerik yok)
- [ ] Giriş / kayıt / JWT yenileme
- [ ] Yönetim paneli yalnızca Admin JWT
- [ ] Başkasının `GET /api/configurations/{id}` → 401/403
- [ ] Teklif POST PII ile → 403 `PII_DISABLED`
- [ ] PDF export 500'de `ex.Message` sızdırmıyor (`application/problem+json`)

## Gözlem
- [ ] Loglarda yığın izi istemciye gitmiyor
- [ ] Rate limit (429) gerçek istemci IP'sine göre (X-Forwarded-For)
- [ ] Yedek: Postgres volume / `pg_dump` planı
