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
RUN npm run build

# --- Runtime ---
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
