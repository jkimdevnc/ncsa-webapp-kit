# Step 14: Multi-architecture images on GHCR (the start of Stage 2)

Status: done (PR #20, tag `step-14`).

## Context
Stage 2 runs the app on Kubernetes: first OrbStack's local cluster (arm64, your Mac), then the NCSA cluster
(amd64). Clusters pull images from a registry, so this step makes CI build both images for **both architectures**
and push them to GitHub's container registry (GHCR), tagged with the git commit. Step 15's manifests will point at
these images. No application code changes; this is CI and build configuration.

Decisions (approved 2026-10-28):
- **A new workflow, `images`, runs on pull requests too**, not only on `develop`. So you can inspect a PR's images
  before merging, and the amd64 smoke test is a PR check (red = don't merge, like `ci` and `stack`).
- **Tags**: `sha-<7-char commit>` on every run, plus `develop` or `main` when that branch is pushed. Images are never
  overwritten under a sha tag.
- **GHCR packages stay private**, like the repo. The image label `org.opencontainers.image.source` links each
  package to the repo, so the repo's access applies. CI pushes with its own `GITHUB_TOKEN`; no secrets to add.
- **arm64 is built under emulation (QEMU) on GitHub's amd64 runners.** That's slower but free; GitHub's native
  arm64 runners aren't free for private repos. The frontend's Node build stage runs on the runner's own architecture
  (`--platform=$BUILDPLATFORM`), since its output (static files) is the same for both; only the small Caddy stage is
  per-architecture.
- **`make images` builds both architectures locally without pushing**, to check that they build. OrbStack's Docker
  already supports this (containerd image store, amd64 emulated). Pushing happens only in CI.

## What I build
1. **`.github/workflows/images.yml`**:
   - Job `images`: for `api` (context `backend/`) and `web` (context `frontend/`): QEMU, buildx, log in to GHCR,
     `docker/build-push-action` with `platforms: linux/amd64,linux/arm64`, the tags and label above, and the GitHub
     Actions build cache. Permissions: `contents: read`, `packages: write`.
   - Job `smoke` (needs `images`, amd64 runner): pull the two new images by sha tag and start them with a Redis
     container on one Docker network. Pass when **the API's `readyz` returns 200 and `web` serves the app and
     proxies `/api/v1/readyz`**. Container logs are printed on failure.
2. **`frontend/Dockerfile`**: the build stage gets `--platform=$BUILDPLATFORM` (no other change).
3. **`Makefile`**: `make images`, which runs `docker buildx build --platform linux/amd64,linux/arm64
   --output type=cacheonly` for both images, with no push.
4. **README**: "Images" (where they are, the tags, how to inspect them), and the `images` check under CI.

Tests added:
- **amd64 smoke test in CI**: the API container starts and `readyz` returns 200, and `web` serves the app and
  passes `/api` to the API.
- Before the first CI run, the smoke test's commands were dry-run locally against the Compose images (on other
  ports, since a dev API was on 8000), and `make images` built both architectures.
- The full E2E suite against Kubernetes comes in Steps 15–16.

**Later (not now):** release tags (`vX.Y.Z`) on images, image signing and SBOMs, cleanup of old images, making the
packages public, and the pull secret Kubernetes needs for private images (Step 15).

## How you verify
- On the PR: `images` and `smoke` are ✓, along with `ci`, `stack` and `branch-policy`.
- Locally: `make images` builds both architectures (a few minutes; amd64 is emulated).
- From your Mac (once: `gh auth refresh -s read:packages`, because the packages are private, then
  `gh auth token | docker login ghcr.io -u jkimdevnc --password-stdin`):
  ```bash
  docker buildx imagetools inspect ghcr.io/jkimdevnc/mosaic-api:sha-<commit>   # lists linux/amd64 and linux/arm64
  docker buildx imagetools inspect ghcr.io/jkimdevnc/mosaic-web:sha-<commit>
  ```
- GitHub → your profile → Packages shows `mosaic-api` and `mosaic-web`, linked to the repo.
- `make lint` and `make test` are green.
