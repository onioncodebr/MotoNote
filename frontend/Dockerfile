# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# De propósito, sem VITE_API_URL/.env aqui: services/api.js cai no default
# de caminho relativo (fetch pra "/api/...") quando a variável não existe —
# é o que faz o app funcionar sob qualquer domínio, sem hardcoded nada,
# já que em produção frontend e backend ficam atrás do mesmo domínio (ver
# DEPLOY.md).
#
# VITE_WHATSAPP_NUMBER já pode vir de fora (docker-compose.prod.yml -> build
# args -> .env da VPS), porque o Vite só embute VITE_* no bundle durante o
# build — sem isso aqui, o link "Fale com nosso suporte" cai num "#contato"
# morto em vez de abrir o WhatsApp.
ARG VITE_WHATSAPP_NUMBER
ENV VITE_WHATSAPP_NUMBER=$VITE_WHATSAPP_NUMBER
# Site Key do Cloudflare Turnstile — é pública de propósito (é assim que o
# widget funciona, só a Secret Key do backend é sensível). Sem essa
# variável, o widget de verificação simplesmente não renderiza.
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN npm run build

# --- Runtime ---
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
