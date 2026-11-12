# MOSAIC prototype

A small, changeable prototype framework for **MOSAIC**, a skeletal-analysis web app. It runs one slice of the real
workflow end to end:

1. A Workup is filled in **in the browser**: a name plus a few Cranium measurements, with range warnings.
2. **Analyze** sends the measurements to the **FastAPI** backend, which runs an ML model directly.
3. The result is kept **only in Redis memory** (it expires, and holds no entered values) and shown with a run log.

The stack is React + Vite (frontend), FastAPI (backend), Redis (in-memory, nothing on disk), Caddy, and Docker
Compose. This repo is a **GitHub template**: the real MOSAIC repo is created from it once the prototype is proven.

> Status: under construction, built one step at a time. Each step adds setup checks (`make doctor`) and feature
> regression tests (`make test`). Verified steps are tagged `step-N`. See `docs/decisions/` for why things are the
> way they are.

## Stages

1. **Local (Stage 1)**: everything runs on a MacBook Pro M1. First the dev servers (uvicorn + Vite, with Redis in
   Docker), then the full stack in Docker Compose.
2. **Kubernetes (Stage 2)**: after Stage 1 works. Multi-architecture images on GHCR, tried on OrbStack's local
   Kubernetes first, then deployed to the NCSA-managed cluster.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| uv | 0.13+ | `brew install uv` (it installs Python 3.15 for the backend on first use) |
| Docker (OrbStack) | Docker 29+, Compose v2+ | `brew install --cask orbstack`, then open it once |
| Node | 26 | already installed (or via nvm) |
| gh | 2.x | `brew install gh`, then `gh auth login` |

## Everyday commands

```bash
make help      # list all commands
make setup     # one-time: install the pre-commit hooks
make doctor    # check that tools, repo, and services are set up correctly
make lint      # run all linters and formatters on every file
make test      # run the full regression test suite
```

`make doctor` works for any collaborator. Its "Repo settings" checks run only for repo admins; for everyone else
they show as skipped.

## Local Redis

During development only Redis runs in Docker; the API and frontend run as dev servers.

```bash
docker compose up -d redis   # start it (make doctor expects it running)
docker compose down          # stop it; every key is gone
```

Redis keeps everything in memory: no snapshots, no AOF, no volume, and a 256 MB cap with `volatile-ttl` eviction
(see [docs/decisions/0001](docs/decisions/0001-redis-in-memory-only.md)). It listens on `127.0.0.1:6379` only.

## Backend (API dev server)

```bash
cd backend
uv run uvicorn app.main:app --reload     # http://localhost:8000/docs
curl -i localhost:8000/api/v1/livez      # 200 while the process is up
curl -i localhost:8000/api/v1/readyz     # 200 when Redis answers, 503 when it doesn't
curl localhost:8000/api/v1/dictionary    # the variables and their possible ranges
```

The variables live in `backend/app/data/dictionary_v0.json` (data, not code). Ranges marked
`placeholder: to be confirmed by the PI` are demo values.

Settings come from env vars or the repo's `.env` (see `.env.example`). Logs go to stdout. `make test-be` runs the
backend tests; its `integration` tests need Redis running, and `make test-fast` skips them.

## CI

GitHub Actions runs `make lint` and `make test` (with a Redis service container) on every pull request into
`develop` or `main` and on every push to them ([.github/workflows/ci.yml](.github/workflows/ci.yml)). A red `ci` or
`branch-policy` check means **do not merge**: GitHub Free can't block the merge for a private repo, so the rule is
ours to keep.

## Branching

`develop` is the default branch. Work happens on `feature/*` (or `fix/*`, `docs/*`, `chore/*`) branches and reaches
`develop` through pull requests, merged with a merge commit. `main` only receives `develop`, at milestones, and each
release is tagged `vX.Y.Z`. Verified steps are tagged `step-N`. Merged branches are not deleted automatically; they
are either deleted on request or renamed with a `_DONE` suffix for reference. Direct commits to `main` and `develop` are blocked by
a pre-commit hook, and the `branch-policy` check fails PRs from the wrong kind of branch. See
[docs/decisions/0007](docs/decisions/0007-branching-model.md).

## Repository layout

| Path | Contents |
|---|---|
| `backend/` | FastAPI app, tests (from Step 3) |
| `frontend/` | React + Vite app, tests (from Step 8) |
| `scripts/` | Helper scripts, e.g. `doctor.sh` |
| `docs/decisions/` | Architecture decision records, each with "revisit when" triggers |
| `CLAUDE.md` | Rules for AI-assisted coding in this repo |
