# Step 2: Storage service in Docker Compose

## Goal
Run the app's storage service locally in Docker Compose, configured for the chosen persistence mode. Under the
default mode (results only, in memory), nothing may ever reach disk.

## Required deliverables
- `docker-compose.yml` with one storage service. During Steps 2–12 Compose runs only this service; the API and
  frontend run as dev servers. Step 13 adds their containers to the same file.
- Under the default persistence mode (in-memory Redis or similar):
  - no snapshots and no append-only file;
  - a memory cap and an eviction policy that only evicts keys with a TTL;
  - a tmpfs data folder, no named volume;
  - the port bound to `127.0.0.1` only;
  - a healthcheck.
- `make doctor` checks that the service answers and that its settings match the mode (for in-memory Redis: PING,
  `save` empty, `appendonly no`, memory cap, eviction policy, no volume).
- A README section "Local storage" (how to start, stop and inspect it).

## Acceptance checks
1. `docker compose up -d <storage>` starts it, and its health check turns healthy.
2. The service answers a ping (for Redis: `redis-cli ping` returns `PONG`).
3. Default mode: the config shows no persistence (for Redis: `config get save` is empty, `appendonly` is `no`).
4. Default mode: write a key, restart the service, and the key is gone.
5. The port is not reachable from other machines (bound to localhost).
6. `make doctor` passes, including the new storage lines; stopping the service makes them fail with a clear hint.

No feature tests yet. "Results are not saved to disk" is a feature requirement, so its regression test comes with the
feature (Step 13's E2E test: after a storage restart, the run log is empty).

## Default (MOSAIC's way)
MOSAIC used `redis:7-alpine` with `--save ""`, `--appendonly no`, `--maxmemory 256mb`,
`--maxmemory-policy volatile-ttl`, tmpfs `/data`, port `127.0.0.1:6379`, and a healthcheck. `scripts/doctor.sh`
got six Redis checks. The README got a "Local Redis" section.

Reference: reference/step-02/ (plan.md, changes.txt, files/).

Adapt: the service name and the key prefix (`<slug>:`, used from Step 7).

## Swap notes
Depends on: persistence mode, storage/cache, container runtime.

- **Postgres (persistent store):** a `postgres` service with a named volume (data is meant to stay), a
  healthcheck (`pg_isready`), localhost-only port, and a git-ignored password from `.env`. Doctor checks: it answers,
  the database exists, and the app user is not a superuser. Check 4 is replaced by "a row written before a restart is
  still there"; the "nothing on disk" check does not apply, and the retention rule (Step 7) takes its place.
- **Valkey or KeyDB instead of Redis:** same flags and checks; only the image changes.
- **Server-save persistence mode with Redis:** turn on AOF or snapshots and a volume on purpose, and record it in the
  ADR. Doctor checks the chosen settings, not "no persistence".
- **No storage at all (stateless results):** skip the service, and say so in the plan; later steps drop the run log.

Must not change:
- Compose is the one way to run local services; the port is bound to localhost only.
- `make doctor` checks the storage settings that the persistence mode promises.
- Under the default mode: nothing on disk, and only keys with a TTL are evicted.
