# The steps at a glance

This file holds two things:
- **the overview format** the user asked for;
- **the generic overview** of all 18 steps, written in that format.

The detail for each step is in its contract (`step-NN.md`). This page is the short version a user reads to see where
they are.

## When to show it

Show the overview:
- when the user asks for the steps, the plan, the status, or "where are we";
- when a session resumes, right after reading `.framework/state.json`;
- right after the interview, before Step 1, so the user sees the whole road once.

At each step's own stop, show only that step's row in full: its "You check" list, with this project's values.

## The format (keep it exactly)

- **Two tables, split by stage:**
  - Stage 1, local: Steps 0–13;
  - Stage 2, Kubernetes: Steps 14–16.
- **Three columns:**
  - **Step:** the number, then a specific name, for example "7 · Analyze API + results in storage".
  - **What it builds:** the specific files, endpoints and tools, not a vague summary.
  - **You check:** numbered actions ① ② ③ with exact commands, URLs and expected results.
- **Status marks after the step name:** done ✅, current ▶, needs setup or should be skipped ⚠.
- **A note above the tables:** from Step 2 on, the last check of every step is "`make lint` and `make test` pass,
  and CI is green on the PR". This is why the rows don't repeat it.

**Why this format.** The user verifies every step. They need to see three things at once: what exists, what comes
next, and the exact things to try. A vague "set up CI" doesn't tell them what to click.

## How to fill it in for a real project

- **Status:** steps before `current_step` in `state.json` are ✅, and the current step is ▶. A step that is skipped,
  or that needs setup only the user can do, gets ⚠ and a short reason.
- **Values:** take them from `project.yaml`:
  - the entity name (`<entity>`, plural `<entity>s`);
  - the slug and the variable codes;
  - the outputs, with a known input and its expected outputs from the model tests;
  - the URLs and ports (`localhost:8000`, `localhost:3000`, `localhost:8080`, `localhost:<local_k8s_port>`,
    `https://<host>`).
- **Swaps:** name the swap in the step name, for example "2 · Postgres in Docker (swapped from Redis)". Change the
  checks to the swapped tool's commands.
- **Steps not done yet:** keep the generic wording below, filled with this project's values.

## The generic overview

From Step 2 on, the last check of every step is also: `make lint` and `make test` pass, and CI is green on the PR.

### Stage 1: local

| Step | What it builds | You check |
|---|---|---|
| **0 · Install dev tools** | uv (Python), Docker + Compose, Node, a `gh` login. No repo yet. | ① `uv --version`, `node --version` ② `docker run --rm hello-world` prints a greeting ③ `gh auth status` shows the account for `<owner>` |
| **1 · Create private repo + rules** | Private GitHub repo `<owner>/<repo>`; `README`, `CLAUDE.md` with the regression test rules; ADRs in `docs/decisions/`; Makefile (`doctor`, `lint`, `test`); `scripts/doctor.sh`; pre-commit; `.env.example` | ① The repo shows **Private** on GitHub ② `make doctor` → all pass ③ `make test` → "no tests yet" for each layer |
| **1b · Branching model + PR rules** | `develop` as the default branch; merge commits only; a hook that blocks commits to `main`/`develop`; the `branch-policy` CI check; a PR template with a "Tests:" block; `docs/plans/` | ① GitHub's default branch is `develop` ② `git commit --allow-empty -m test` on `develop` → blocked ③ A PR from a branch like `wip-test` → `branch-policy` red ④ The merge button offers only "Create a merge commit" |
| **2 · Storage in Docker (Redis by default, memory only)** | `docker-compose.yml` with the storage service: no disk saving, port bound to localhost; storage checks in `make doctor` | ① `docker compose up -d redis` → healthy ② `docker compose exec redis redis-cli ping` → `PONG` ③ Set a key, restart Redis → the key is gone |
| **3 · API health probes + pytest** | FastAPI app, settings from env vars, `GET /api/v1/livez` and `/readyz`, pytest unit + integration tests | ① Start the API, open `localhost:8000/api/v1/readyz` → 200, storage ok ② Stop storage → `readyz` 503, `livez` still 200 ③ `localhost:8000/docs` lists both probes |
| **4 · CI on every PR** | `.github/workflows/ci.yml`: a `ci` job running `make lint` + `make test` with a storage service container | ① The `ci` check is green on the PR ② A throwaway PR that breaks a test → `ci` red, naming the test (then closed) |
| **5 · Variable dictionary (your variables)** | `dictionary_v0.json` with your variables (code, label, unit, possible range, precision, optional section); `GET /api/v1/dictionary`; the file is checked at startup | ① `localhost:8000/api/v1/dictionary` → your variables with ranges ② It appears on `/docs` ③ A duplicate code in the file → the API refuses to start, with a clear message |
| **6 · Toy model (your outputs)** | A small seeded model trained by `make model`; the model catalog; loaded once at startup; `readyz` shows the model | ① `make model`, then start the API ② `readyz` → `model: "loaded"` with id and version ③ Rename the model file → startup fails with "Run `make model`" |
| **7 · Analyze API + results in storage** | `POST /api/v1/analyses` returns your outputs; the result is stored with a TTL and **no entered values**; `GET /api/v1/<entity>s/{id}/analyses` (run log) | ① A curl POST with a known input → the expected outputs ② `curl …/<entity>s/<id>/analyses` → 1 entry ③ The `<slug>:analysis:*` key holds none of the entered numbers ④ That key has a TTL |
| **8 · React frontend + status panel** | Vite + React + TypeScript app; dev proxy to the API; a status panel reading `readyz`; Vitest; eslint/prettier | ① Open `localhost:3000` → API ok, storage ok, Model loaded ② Stop storage → "down" within about 10 s ③ Stop the API → "unreachable" |
| **9 · Typed API client from OpenAPI** | `openapi.json` + generated TypeScript types (`make gen-api`); `make check-openapi` fails when they're stale | ① `make check-openapi` passes ② The demonstration: rename a field without regenerating → the check fails → reverted |
| **10 · Playwright browser tests** | Playwright setup; the first E2E test ("the app loads, status all ready"); the address comes from `BASE_URL` | ① `make test-e2e` → passes headless ② Stop storage → it fails with a readable message ③ Open the HTML report it points to |
| **11 · `<entity>` entry screen** | A screen with one field per dictionary variable (grouped by section), a name, range errors ("Not possible"), and saving in browser local storage only | ① Type an out-of-range value → error under the field ② Fix it → error clears ③ Reload → name and values still there ④ DevTools → Network: no values sent while typing |
| **12 · Analyze button + result + run log** | Analyze button (disabled while any input is invalid); a **Result** box with every output; a **Run log** list under it | ① A known input → Analyze → the expected outputs ② Run log → 1 entry ③ Analyze again → 2 ④ An out-of-range value → button disabled ⑤ Network: only the POST carries values ⑥ The stored record holds none of the entered numbers |
| **13 · Full stack in Docker Compose** | `api` + `web` (built frontend, `/api` proxied) + storage containers, all non-root; `make up` / `make down`; the `stack` CI job; the storage-restart E2E test | ① `make up` → all services healthy ② `localhost:8080` → enter, Analyze, result, run log ③ `make test-e2e-local-stack` passes ④ `make down` |

### Stage 2: Kubernetes

| Step | What it builds | You check |
|---|---|---|
| **14 · Multi-arch images in the registry** | CI builds `api` + `web` images for amd64 + arm64, tagged with the commit, and pushes them to GHCR (`ghcr.io/<owner>/<slug>-api`, `-web`); an amd64 smoke test; `make images` | ① PR checks `images` and `smoke` are green ② `docker buildx imagetools inspect <image>:<sha>` lists both architectures ③ The owner's **Packages** tab shows both images |
| **15 · Kubernetes on a local cluster (OrbStack)** | Kustomize manifests: storage ×1, api ×2, web ×1; `web` on `localhost:<local_k8s_port>`; `make k8s-up` / `k8s-down`; the replicas E2E test | ⚠ First turn on Kubernetes in OrbStack, and check the port is free. ① `make k8s-up` ② `kubectl get pods` → all 4 Running and Ready ③ The URL it prints → the whole flow works ④ `make test-e2e-k8s` passes ⑤ `make k8s-down` |
| **16 · Deploy to staging (NCSA by default)** | A staging overlay, a public HTTPS host `https://<host>`, a NetworkPolicy, and cluster checks in `make doctor` | ⚠ Needs the cluster's namespace, pull secret and kubeconfig (the user sets these up). ① `make <target>-up` ② `get pods` → all Running and Ready ③ `https://<host>` → valid certificate, the whole flow works ④ `make test-e2e-<target>` passes |
