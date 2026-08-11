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

# Servis asamasi
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
