# Step 1: Repo setup (+ test runner and `make doctor`)

Status: done (commits `48b6c7b`, `5fedc32`, tag `step-1`; no PR, because `develop` and the PR flow start in
Step 1b). Rebuilt afterwards from the overview build plan and the commits.

## Context
The prototype needs a home before any feature: a private GitHub repo (marked as a template, since the real MOSAIC repo
will be created from it), the rules for AI-assisted coding, the first design decisions written down, and the two
commands every later step relies on: `make doctor` for setup checks and `make test` for the regression suite.

## What I build
1. **Skeleton** (`48b6c7b`): `README.md`, `CLAUDE.md` (working style, test rules, "design for change" swap points),
   `.gitignore`, `.editorconfig`, `.env.example`, and empty `backend/` and `frontend/` folders.
2. **Decision records** in `docs/decisions/`, each with "revisit when" triggers:
   - 0001 Redis only, in memory
   - 0002 the model runs directly in the API
   - 0003 form data stays in the browser until Analyze
   - 0004 React + Vite with a typed OpenAPI client
   - 0005 regression-test policy
   - 0006 two-stage deployment: local on the M1 first, then Kubernetes (OrbStack, then NCSA)
3. **Tooling** (`5fedc32`):
   - a `Makefile` with `help`, `setup`, `doctor`, `lint` and `test*` targets. The test layers print "no tests yet"
     until their steps add them.
   - `scripts/doctor.sh`: Step 0's tool checks plus repo checks, printed as ✓/✗ lines.
   - `.pre-commit-config.yaml`: standard hygiene hooks plus ruff, run by `make lint`.
4. **GitHub**: `gh repo create … --private`, push, `gh repo edit --template`.

## How you verify
- `git log --oneline` shows the small Step 1 commits, and `git remote -v` shows the GitHub URL.
- `gh repo view --json visibility,isTemplate` → `PRIVATE`, `true`; the GitHub page shows the "Template" badge.
- `make doctor` → all ✓.
- `make test` runs and prints "no tests yet".

No tests: this step has no features (the test runner is now in place).

## Changes during the step
- eslint and prettier were left out of pre-commit until there is frontend code (Step 8).
