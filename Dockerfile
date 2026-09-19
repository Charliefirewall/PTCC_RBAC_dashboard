# syntax=docker/dockerfile:1.7

# PTCC Smart Operation Management — production image.
#
# Multi-stage, and the stage order is deliberate. The map asset pack is ~21 MB fetched
# from OpenFreeMap and takes a couple of minutes; it depends only on tools/fetch-tiles.mjs,
# so it gets its own stage and is cached independently of the application source. Editing a
# component rebuilds the app in seconds and does not re-download a third-party database.
#
# Result: a self-contained static image that serves the whole demo — application, basemap,
# glyphs and sprite — with no runtime network access of any kind.

ARG NODE_VERSION=22-alpine
ARG NGINX_VERSION=1.27-alpine


# ──────────────────────────────────────────────────────────────── 1. dependencies
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Only the manifests, so this layer survives any source change.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund


# ──────────────────────────────────────────────────────────────── 2. map asset pack
# Cached on tools/fetch-tiles.mjs alone. The script uses only node: builtins, so this
# stage needs no node_modules.
FROM node:${NODE_VERSION} AS tiles
WORKDIR /app
COPY tools/fetch-tiles.mjs ./tools/fetch-tiles.mjs
RUN node tools/fetch-tiles.mjs \
 && test -d public/tiles \
 && echo "tile pack: $(find public/tiles -name '*.pbf' | wc -l) tiles, $(du -sh public | cut -f1)"


# ──────────────────────────────────────────────────────────────── 3. build
FROM node:${NODE_VERSION} AS build
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY tools ./tools

# The asset pack must be in public/ BEFORE vite runs — vite copies public/ into dist/
# verbatim, and that copy is what makes the served app work with no network.
COPY --from=tiles /app/public ./public

RUN npm run build \
 && test -f dist/index.html \
 && test -d dist/tiles \
 && test -d dist/fonts \
 && echo "bundle: $(du -sh dist | cut -f1)"


# ──────────────────────────────────────────────────────────────── 4. runtime
# nginx-unprivileged runs as uid 101 and listens on 8080 — no root in the container and
# no capability needed to bind the port.
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime

LABEL org.opencontainers.image.title="PTCC Smart Operation Management" \
      org.opencontainers.image.description="Role-based control-centre dashboard for the Ulaanbaatar public bus network. Simulated data; not a production control system." \
      org.opencontainers.image.source="https://github.com/Charliefirewall/PTCC_RBAC_dashboard" \
      org.opencontainers.image.licenses="UNLICENSED"

# default.conf REPLACES the base image's own server block — landing beside it as a
# second file left the image's config as the default server, which answered every
# request and 404'd /healthz. The headers snippet goes in snippets/, NOT conf.d/,
# because nginx auto-includes every conf.d/*.conf into the http block.
COPY deploy/nginx.conf            /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf

# Fail the BUILD on a bad config rather than the deployment.
RUN nginx -t
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Served entirely from disk, so "healthy" means nginx is answering — there is no
# upstream or database whose absence could make a 200 a lie.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
