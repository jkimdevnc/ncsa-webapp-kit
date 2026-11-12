# Step 2: Redis in Docker (in memory only)

Status: done (PR #3, tag `step-2`). Rebuilt afterwards from the overview build plan and PR #3.

## Context
Results will live in Redis with a TTL, and nothing may reach disk (decision 0001). During Steps 2–12 Compose runs
only Redis, while the API and frontend run as dev servers; Step 13 adds their containers to the same Compose file.

## What I build
1. **`docker-compose.yml`** with one `redis` service (`redis:7-alpine`):
   - no RDB snapshots (`--save ""`) and no AOF (`--appendonly no`)
   - `--maxmemory 256mb --maxmemory-policy volatile-ttl`
   - tmpfs `/data`, no Docker volume
   - port 6379 bound to `127.0.0.1` only, and a healthcheck
2. **`make doctor`**: 6 Redis checks (PING, `save` empty, `appendonly no`, memory cap, eviction policy, no volume).
3. **README**: a "Local Redis" section.

## How you verify
- `docker compose up -d redis`, then `docker compose exec redis redis-cli ping` → `PONG`.
- `redis-cli config get save` → empty; `config get appendonly` → `no`.
- `set hello world`, `docker compose restart redis`, `get hello` → `(nil)`.
- `make doctor` → all ✓, including the Redis lines.

No tests yet. "Results are not saved to disk" is a feature requirement, so its regression test comes with the feature
(Step 13's E2E test: after Redis restarts, the run log is empty).
