# syntax=docker/dockerfile:1

# ---------- Etape 1 : build de l'application React ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etape 2 : serveur web statique ----------
# Seuls les fichiers statiques generes par Vite sont embarques : l'image finale
# ne contient ni Node, ni node_modules (~25 Mo au lieu de ~400 Mo).
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf         /etc/nginx/conf.d/default.conf
COPY proxy_headers.conf /etc/nginx/proxy_headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
