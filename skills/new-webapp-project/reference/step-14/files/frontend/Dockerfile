# The web image: the built frontend served by Caddy, which also passes /api to the API. Build context: frontend/.

# Build stage: install the locked packages and build the static app into dist/. It runs on the build machine's own
# architecture: the output is static files, the same for every architecture, so a multi-arch build doesn't emulate it.
FROM --platform=$BUILDPLATFORM node:26-trixie-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# Run stage: Caddy only, as a non-root user (port 8080 needs no root).
FROM caddy:2-alpine

RUN adduser -D -H -u 10001 web \
    && chown -R 10001:10001 /data /config
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

USER 10001
EXPOSE 8080
