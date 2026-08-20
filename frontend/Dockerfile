# Build asamasi
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Tarayicida calisacagi icin API adresi host makineden erisilebilir olmali
# (konteyner-ici DNS adi "api" degil, disariya acilan port kullanilir).
ARG VITE_API_URL=http://localhost:5007
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Servis asamasi — root degil, uid 101 (nginx). HTTP 8080, HTTPS 8443.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx security-headers.conf /etc/nginx/conf.d/security-headers.inc
USER nginx
EXPOSE 8080 8443
