# Step 1: Repo setup, rules, `make doctor` and `make test`

## Goal
Give the project a home: a private GitHub repo with the coding rules, the first design decisions, linting, and the two
commands every later step relies on, `make doctor` (setup checks) and `make test` (the regression suite).

## Required deliverables
- A private repo `<owner>/<repo>` on GitHub (marked as a template if the user wants one).
- `README.md` (what `<Title>` is, how to run it) and `CLAUDE.md` with:
  - the working style (one step at a time, small commits, the commit message form `step N: ...`);
  - the regression test rules, copied word for word from `references/testing.md` (only tool names swapped);
  - the terms "Verify" (`make doctor`) and "Test" (`make test`);
  - the current design and the swap-point table (runner, store, auth, dictionary data, model catalog, `<entity>`
    store in the browser);
  - "never commit secrets; document settings in `.env.example`".
- `.gitignore`, `.editorconfig`, `.env.example`, and empty `backend/` and `frontend/` folders.
- `docs/decisions/` with an index and one ADR per first decision, each with "revisit when" triggers:
  persistence mode and storage, how the model runs, where entered data lives, frontend + typed API client,
  the regression-test policy, and the deployment stages.
- A `Makefile` with at least `help`, `setup`, `doctor`, `lint`, `test`, and the test layers (`test-be`, `test-fe`,
  `test-e2e`, `check-openapi`), which print "no tests yet" until their steps fill them in.
- `scripts/doctor.sh`: Step 0's tool checks plus repo checks (remote set, hooks installed), printed as pass/fail
  lines, exiting non-zero on any failure.
- A pre-commit config with hygiene hooks plus the backend linter/formatter, run by `make lint`.

## Acceptance checks
1. `git log --oneline` shows small Step 1 commits; `git remote -v` shows `<owner>/<repo>`.
2. `gh repo view --json visibility` shows `PRIVATE` (and `isTemplate: true` if chosen).
3. `make doctor` prints all checks passing.
4. `make lint` passes on the new files.
5. `make test` runs and prints "no tests yet" for each layer, exiting 0.
6. `CLAUDE.md` contains the regression rules section matching `references/testing.md`.
7. `.env` is git-ignored, and `.env.example` exists.

No tests are added: there are no features yet. The test runner is now in place.

## Default (MOSAIC's way)
MOSAIC wrote `README.md`, `CLAUDE.md`, ADRs 0001–0006 (Redis only in memory, the model runs directly in the API,
form data stays in the browser, React + Vite with a typed OpenAPI client, the regression-test policy, two-stage
deployment), a `Makefile`, `scripts/doctor.sh` with ✓/✗ lines, and `.pre-commit-config.yaml` with ruff. It created
the repo with `gh repo create ... --private` and then `gh repo edit --template`. eslint and prettier were left out of
pre-commit until there was frontend code (Step 8). Commits were pushed straight to `main`; `develop` starts in
Step 1b.

Reference: reference/step-01/ (plan.md, changes.txt, files/).

Adapt: the repo name, owner, the "Workup" swap point (becomes the `<entity>` store), and the ADR titles to the
chosen stack and persistence mode.

## Swap notes
Depends on: persistence mode, backend, storage, frontend, linters, test runners, deploy target, owner/naming.

- **Postgres instead of Redis:** ADR 0001 becomes "Postgres, with a retention rule"; doctor checks come in Step 2.
- **Server-save persistence mode:** the "data stays in the browser" ADR becomes "entered values are stored only in
  `<declared place>`, with this retention".
- **Other linters (eslint-only backend, golangci-lint, black + flake8):** the pre-commit hooks change; `make lint`
  still runs them all.
- **Other test runners:** the test-layer targets keep their names; only what they call changes.

Must not change:
- The make target names: `help`, `setup`, `doctor`, `lint`, `test`, `test-be`, `test-fe`, `test-e2e`, `check-openapi`.
- `make doctor` is for setup checks only; `make test` is for feature tests only.
- The regression rules in `CLAUDE.md` follow `references/testing.md` word for word.
- No secrets in the repo; the repo is private unless the user says otherwise.
