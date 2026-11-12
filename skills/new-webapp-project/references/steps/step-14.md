# Step 14: Multi-architecture images in a registry (start of Stage 2)

## Goal
Make CI build the `api` and `web` images for both amd64 and arm64 and push them to a container registry, tagged with
the git commit, so Kubernetes clusters can pull them. No application code changes.

## Required deliverables
- A CI workflow `images`, run on pull requests **and** on pushes to `develop` and `main`:
  - job `images`: for `api` (context `backend/`) and `web` (context `frontend/`), build for
    `linux/amd64,linux/arm64` and push to `<registry>/<owner>/<slug>-api` and `<slug>-web`;
  - tags: `sha-<7-char commit>` on every run (never overwritten), plus `develop` or `main` on those branches;
  - a source label (e.g. `org.opencontainers.image.source`) linking each image to the repo;
  - a build cache; least permissions (read contents, write packages); CI's own token, no new secrets;
  - job `smoke` (needs `images`, amd64 runner): pull both new images by sha tag, start them with a storage container
    on one network, and pass only when `api`'s `readyz` returns 200 and `web` serves the app and proxies
    `/api/v1/readyz`. Container logs are printed on failure.
- Build stages whose output does not depend on the architecture (the frontend build) run on the build machine's own
  platform, so only the small runtime stage is per-architecture.
- `make images`: build both architectures locally, without pushing.
- README "Images": where they are, the tags, how to inspect them; the `images` and `smoke` checks under CI.
- Registry packages stay private when the repo is private.

## Acceptance checks
1. On the PR: `images` and `smoke` pass, along with `ci`, `stack` and `branch-policy`.
2. `make images` builds both architectures locally.
3. Inspecting each image's sha tag (e.g. `docker buildx imagetools inspect`) lists `linux/amd64` and `linux/arm64`.
4. The registry shows both packages, linked to the repo.
5. `make lint` and `make test` pass.
6. Test added: the amd64 smoke test in CI (the `api` container is ready; `web` serves the app and passes `/api` on).
   The smoke commands are dry-run locally against the Compose images before the first CI run.

## Default (MOSAIC's way)
`.github/workflows/images.yml` with QEMU, buildx, `docker/build-push-action`, the GitHub Actions cache, pushing to
GHCR (`ghcr.io/jkimdevnc/mosaic-api`, `mosaic-web`) with `GITHUB_TOKEN`. arm64 was built under QEMU emulation on
amd64 runners (free for private repos). `frontend/Dockerfile`'s build stage got `--platform=$BUILDPLATFORM`.
`make images` ran `docker buildx build --platform linux/amd64,linux/arm64 --output type=cacheonly`. Viewing private
packages needed `gh auth refresh -s read:packages` and a `docker login ghcr.io`.

Note: MOSAIC's changes.txt for this step also lists backend and frontend files. Those came from the review-fix PR
(#19), merged between Steps 13 and 14, not from this step. The relevant fixes are folded into Steps 7, 9, 10 and 11
of these contracts.

Reference: reference/step-14/ (plan.md, changes.txt, files/).

Adapt: `<owner>`, `<slug>`, the registry host.

## Swap notes
Depends on: registry, CI, container/web server, owner/naming.

- **Another registry (Harbor, quay.io, Docker Hub, GitLab):** a login step with a CI secret; the image names change.
  Record the secret in the README, never in the repo.
- **Native arm64 runners available:** build each architecture natively and merge the manifests; faster, same tags.
- **Public repo:** packages may be public, and Step 15–16 need no pull secret.
- **Single-architecture target:** still build both, because the developer's Mac and the cluster may differ.

Must not change:
- Both architectures for both images; immutable `sha-<commit>` tags.
- The smoke test is a PR check; a red check means "do not merge".
- No secrets committed; CI pushes with its own token where the registry allows.
