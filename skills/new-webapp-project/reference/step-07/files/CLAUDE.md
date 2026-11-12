# MOSAIC prototype: rules for AI-assisted coding

MOSAIC is a skeletal-analysis web app. This repo is its prototype framework: a thin, working slice of the real flow
(Workup data entry in the browser → Analyze → result), built to be changed. Read `README.md` for the overview and
`docs/decisions/` for why the current design looks the way it does.

## Working style

- Work **one step at a time**. The plan has two stages:
  - **Stage 1**: local on a MacBook Pro M1 (arm64). Dev servers first, then the full stack in Docker Compose.
  - **Stage 2**: Kubernetes, starting only after Stage 1 works. OrbStack's k8s first, then the NCSA-managed
    cluster.
- **Commit small and often.** Commit and push each change as soon as it works (`make lint` and `make test` pass).
  Never commit something broken.
- Commit messages look like `step 3: add readyz probe with Redis check`.

## Branching (docs/decisions/0007)

- Never commit directly on `main` or `develop`; the pre-commit hook blocks it.
- Each step:
  1. `git switch develop && git pull`, then `git switch -c feature/step-N-<topic>`. Use `fix/`, `docs/` or
     `chore/` for other work.
  2. Record the workplan step in `docs/plans/step-NN.md` (same parts as the existing ones):
     - **Start:** the first commit is the plan as approved, with Status "in progress".
     - **Done:** before asking the user to verify, the last commit closes it out: Status "done (PR #N, tag
       `step-N`)", content matching what the step delivered, and "Changes during the step" listing only scope or
       design changes the user decided (not small tweaks).
     - **Then it's final.** Later fixes and chores don't touch it. A new file comes only with a new workplan step.
  3. Push small working commits, and open a PR into `develop` early.
  4. The user verifies the step.
  5. Merge with a merge commit (`gh pr merge --merge`, **without** `--delete-branch`).
  6. Tag `step-N` on develop and push the tag. Only then start the next step.
- **Always ask before deleting a work branch** (`feature/`, `fix/`, `docs/`, `chore/`), locally or on GitHub. The user
  may want it renamed with a `_DONE` suffix instead (e.g. `feature/step-2-redis_DONE`). Throwaway test branches can be
  deleted without asking.
- `main` receives only `develop`, through a PR, at milestones the user chooses. Tag each release `vX.Y.Z`.
- Never merge a PR while any check (`branch-policy`, CI) is red.
- Prefer the simplest thing that works. Do not build future features early; the swap points below are where they
  will go.
- Never commit secrets. `.env` is git-ignored; document new settings in `.env.example`.

## GitHub account

The repo is private. If `gh` or `git push` says "Repository not found", the active `gh` account can't see it: run
`gh auth switch -u <your account>`. `make doctor` checks for this. Personal settings (such as which account to use)
go in a git-ignored `CLAUDE.local.md`.

## Terms

- **Verify**: checks that setup is correct (tools, repo, Docker, Redis config). Collected in `make doctor`.
- **Test**: automated **feature** regression tests. Collected in `make test`.

## Regression test rules

1. Every feature change adds or updates tests for that feature.
2. A change is done only when `make test` passes: all earlier tests plus the new ones.
3. Never delete or weaken an existing test to make a change pass. If a past behavior is meant to change, update its
   test deliberately and say so in the commit or PR.
4. Every bug fix gets a test that reproduces the bug.
5. Test what users and the PI care about (behavior and contracts), not incidental details such as exact counts that
   will grow, or CSS classes. E2E tests select elements by role and label.

## Current design (expected to change)

- The API runs the model **directly** while handling the request. No job queue, no worker, no SSE.
- **Redis only, in memory, nothing on disk.** No Postgres.
- Form data stays **in the browser** until Analyze and is never stored or logged on the server.
- Results are stored in Redis with a TTL and hold **no entered values**.
- The frontend talks to the backend only through the typed client generated from the OpenAPI spec.
- The API is versioned under `/api/v1`.
- Kubernetes-friendly from the start:
  - The API is stateless; anything shared lives in Redis or the browser.
  - All config comes from env vars, and logs go to stdout.
  - It has `livez` and `readyz` probes, and containers run as non-root.
  - Images must build for both arm64 (the Mac) and amd64 (the NCSA cluster).

## Swap points (change these, not the callers)

| Future change | Module that changes |
|---|---|
| Job queue (RQ, polling) | `backend/app/runner.py` (`DirectRunner` → `QueueRunner`) |
| Persistence or retention rules | `backend/app/store.py` (`ResultStore`) and settings in `backend/app/config.py` |
| Login (CILogon) | `backend/app/auth.py` (`current_user()`) |
| More variables | `backend/app/data/dictionary_*.json` (data, not code) |
| More or real models | `backend/app/model_catalog.py` |
| Workups stored on the server | `frontend/src/storage/workupStore.ts` |

Stored records carry `schema_version`, and Redis keys use the `mosaic:` prefix.

## Code style

- Python: ruff (lint + format). TypeScript: eslint + prettier.
- `make lint` runs every check; the pre-commit hook runs the same checks on each commit.
- Match the surrounding code's naming, comment density and idioms.

## Reference code

If `../REFERto/MLStopping` is checked out next to this repo, it is a related NCSA app (FastAPI + Redis/RQ + React +
Caddy). Reuse its patterns where the plan says so (model catalog and runtime, worker, Caddyfile, compose layout, CILogon auth), but do not copy its science
code.
