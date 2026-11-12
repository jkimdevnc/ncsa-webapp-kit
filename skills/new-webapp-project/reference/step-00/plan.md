# Step 0: Tool setup

Status: done (no PR or tag: nothing in the repo changes). Rebuilt afterwards from the overview build plan.

## Context
Before any code, the Mac (MacBook Pro M1, arm64) needs the tools the rest of the plan uses: uv for Python, a Docker
runtime for Redis and later the full stack, Node for the frontend, and gh for GitHub. `make doctor` (Step 1) re-checks
all of them from then on.

## What I build
- After the user approves each install: `brew install uv`, and OrbStack (lighter than Docker Desktop, and it
  includes a local Kubernetes for Stage 2).
- Node 26 and gh are already installed.
- Playwright's browser is installed later, in Step 10.

## How you verify
- `uv --version` prints a version.
- `docker --version` and `docker compose version` print versions.
- `docker run --rm hello-world` prints "Hello from Docker!".
- `node --version` → v26.x.
- `gh auth status` → logged in with the account that owns the repo.

No tests: this step has no features.
