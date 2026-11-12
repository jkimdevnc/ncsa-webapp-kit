# Step 0: Tool setup

## Goal
Install the tools every later step needs on the developer's machine. Nothing in the repo changes, so there is no
branch, PR or tag.

## Required deliverables
- A Python tool chain for the backend (or the chosen backend's equivalent, e.g. Node for an Express backend).
- A container runtime with Compose support (`docker` and `docker compose` commands).
- A local Kubernetes option for Stage 2, if the deploy target is Kubernetes (it can be the same app as the container
  runtime).
- Node (a current LTS or newer) for the frontend.
- `gh`, logged in as `<owner>` (the account or org that will own the repo).
- Each install is approved by the user first. Tools that are already installed are only checked, not reinstalled.
- A short note in the session of which versions were found, so Step 1's `make doctor` can check the same tools.
- No browser for E2E tests yet: that comes with the E2E step (Step 10).

## Acceptance checks
1. The backend tool chain prints a version (e.g. `uv --version`).
2. `docker --version` and `docker compose version` print versions.
3. `docker run --rm hello-world` prints its greeting, so the runtime can pull and run images.
4. `node --version` prints the expected major version.
5. `gh auth status` shows a login with `<owner>` (or an account that can create repos under `<owner>`).
6. If Stage 2 is planned on a local cluster: the cluster can be enabled later (no need to enable it now).

No tests are added: this step has no features. From Step 1 on, `make doctor` re-checks all of these tools.

## Default (MOSAIC's way)
MOSAIC ran on a MacBook Pro M1 (arm64). It installed `uv` with Homebrew and OrbStack as the Docker runtime, chosen
because it is lighter than Docker Desktop and includes a local Kubernetes for Stage 2. Node 26 and `gh` were already
installed. Playwright's browser waited for Step 10.

Reference: reference/step-00/ (plan.md only; changes.txt is empty because no files changed).

Adapt: the account name (MOSAIC used its own GitHub account), the Node major version, and the machine's
architecture. If the machine is not arm64, the "build for both architectures" rule still holds for later steps.

## Swap notes
Depends on: backend, container/web server (runtime only), frontend (Node), deploy target, CI (`gh`), owner/naming.

- **Backend not Python:** replace `uv` with that language's tool chain (Node + npm/pnpm, Go, JDK + Gradle). The
  doctor checks in Step 1 follow.
- **Docker Desktop, Colima or Podman instead of OrbStack:** fine, as long as `docker compose` works and multi-arch
  builds (`docker buildx`) are possible. For Stage 2, pick a local cluster (kind, k3d, Docker Desktop's Kubernetes).
- **Deploy target is not Kubernetes:** skip the local-cluster note.
- **Repo on another host (GitLab):** replace `gh` with that host's CLI; later CI steps change accordingly.

Must not change:
- No repo files in this step, and no commits.
- Every install needs the user's approval.
- The same tools are later checked by `make doctor`, so the list here and the doctor list must match.
