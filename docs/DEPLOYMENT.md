# Deployment

The demo ships as a single self-contained container: application, basemap, glyphs and
sprite, served by nginx. **It makes no network calls at runtime** — the offline property
that matters in a control room is preserved all the way into production.

---

## Run it

```bash
docker compose up -d --build     # → http://localhost:8080
```

or without compose:

```bash
docker build -t ptcc-dashboard .
docker run -d -p 8080:8080 --name ptcc ptcc-dashboard
```

Change the published port with `PTCC_PORT=9000 docker compose up -d`.

| | |
|---|---|
| Image size | **68.8 MB** (23 MB of that is the map asset pack) |
| Base | `nginxinc/nginx-unprivileged:1.27-alpine` |
| Runs as | uid **101**, non-root |
| Listens on | **8080** — no privileged port, no capability needed |
| Health | `GET /healthz` → `200 ok` |

---

## How the build is staged

Four stages, ordered so the slow one is cached independently of your source:

```
1. deps     npm ci                      cached on package-lock.json
2. tiles    fetch ~21 MB from           cached on tools/fetch-tiles.mjs alone
            OpenFreeMap                 → editing a component never re-downloads it
3. build    vite build, with the
            asset pack already in
            public/ so it lands in dist/
4. runtime  nginx + dist                nginx -t runs at BUILD time
```

Stage 2 is the reason the Dockerfile looks the way it does. The asset pack is a
third-party database fetched over the network; if it shared a layer with the application
source, every one-line change would re-download it. Split out, a code change rebuilds in
about 15 seconds.

`RUN nginx -t` in the runtime stage means a malformed config **fails the build**, not the
deployment.

---

## What the container hardening does

`docker-compose.yml` runs the container with:

```yaml
read_only: true          # nothing is written at runtime — it is all static files
tmpfs: [/tmp, /var/cache/nginx, /var/run]
cap_drop: [ALL]
security_opt: [no-new-privileges:true]
```

Verified live, not assumed: `read_only=true`, `caps_dropped=[ALL]`, `user=101`, health
`healthy`.

---

## Serving rules worth knowing

### Vector tiles must not be double-encoded

Tiles are stored **decompressed** on disk. nginx compresses them on the fly, which is
correct — it sets `Content-Encoding` itself and the browser transparently decompresses.
What breaks the map is serving a *pre-gzipped* `.pbf` without that header: MapLibre reads
gzip bytes as protobuf, and the map renders **empty with no error anywhere**. `gzip_static`
is therefore deliberately off, and `.pbf` is served as `application/x-protobuf`.

### Security headers are included per-location

nginx inherits `add_header` from an outer block **only if the inner block declares no
`add_header` of its own**. Every location here sets its own `Cache-Control`, so declaring
the security headers once at server level silently dropped all of them from `/index.html`,
`/assets/` and every tile. They live in `deploy/security-headers.conf` and are `include`d
in each location — and the result is asserted against a served response, not read off the
config.

### The CSP allows exactly two external origins

`https://tile.openstreetmap.org` in `img-src` and `connect-src`, for the **opt-in**
`Streets (online)` basemap. It is never the default. Delete both entries from
`deploy/security-headers.conf` to hard-lock the container to offline-only.

`worker-src blob:` is required — MapLibre compiles its tile workers from a blob URL, and
without it the map fails to initialise.

### Caching

| Path | Policy | Why |
|---|---|---|
| `/assets/*` | `max-age=31536000, immutable` | Vite emits content-hashed filenames |
| `/tiles`, `/fonts`, `/sprite`, `/styles` | `max-age=604800` | Rebuilt with the image, not hashed |
| `/index.html` | `no-cache, must-revalidate` | Names the current bundle hashes; a stale copy pins a client to a deployment that is gone |

---

## Verifying a deployment

Every browser suite takes a `PTCC_BASE` override, so the same checks that run against the
dev server can be pointed at a real deployment:

```bash
PTCC_BASE=https://ptcc.example.com npm run verify
PTCC_BASE=https://ptcc.example.com node tools/map-offline-check.mjs
```

Measured against the container on `:8099`:

| Suite | Result |
|---|---|
| Integration (18 routes × 2 themes) | **49 / 49** |
| Journey | **16 / 16** |
| Role interaction | **35 / 35** |
| Agent layer · Motion · Final | **11/11 · 3/3 · 12/12** |
| Offline map | **8 / 8**, 0 off-origin requests |

Zero console errors across all of it — which is what confirms the CSP is not blocking
MapLibre's workers.

---

## Putting it behind a reverse proxy

The container serves plain HTTP on 8080 and sets no `Strict-Transport-Security`; TLS
belongs at the edge. A minimal front:

```nginx
location / {
    proxy_pass http://ptcc:8080;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Add HSTS there once TLS is terminated.

`vite.config.ts` sets `base: './'` and every map asset path is relative, so the app also
works served from a subpath (`https://example.com/ptcc/`) with no rebuild.

---

## Before this goes public

Not blockers for an internal demo; they are blockers for a public URL.

1. **ODbL redistribution.** The image contains OpenStreetMap-derived tiles. Attribution is
   displayed in-app, which ODbL requires — confirm the share-alike obligations before
   publishing the image to a public registry.
2. **There is no authentication.** Role selection is a demo convenience, not a security
   boundary: every role is reachable by URL, and the app says so on screen. Put it behind
   your own auth, or behind a VPN, before exposing it.
3. **The DEMO banner must stay.** It is the thing that stops a simulated figure being read
   as a measurement.
