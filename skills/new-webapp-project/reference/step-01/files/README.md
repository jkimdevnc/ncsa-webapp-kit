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
| uv | 0.13+ | `brew install uv` |
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

## Repository layout

| Path | Contents |
|---|---|
| `backend/` | FastAPI app, tests (from Step 3) |
| `frontend/` | React + Vite app, tests (from Step 8) |
| `scripts/` | Helper scripts, e.g. `doctor.sh` |
| `docs/decisions/` | Architecture decision records, each with "revisit when" triggers |
| `CLAUDE.md` | Rules for AI-assisted coding in this repo |
