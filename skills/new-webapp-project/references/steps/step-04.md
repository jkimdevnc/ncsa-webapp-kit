# Step 4: CI on GitHub

## Goal
Run `make lint` and `make test` automatically on every PR into `develop` or `main` and on every push to them, so
the regression suite no longer depends on someone remembering to run it.

## Required deliverables
- `.github/workflows/ci.yml` with one job, `ci`, on a hosted Linux runner, with read-only repo permissions.
- The storage service as a CI service container, using the **same image** as `docker-compose.yml`, so the
  integration tests run in CI exactly as they do locally.
- The backend tool chain installed with its cache on, using the pinned language version from the repo.
- Steps: `make lint`, then `make test`.
- No frontend tool chain yet (Step 8 adds it).
- Third-party actions pinned to a version (a tag that exists, or a commit sha).
- README "CI" section: the checks, and the rule that a red check means "do not merge" (GitHub Free cannot enforce it
  on a private repo, so the rule lives in CLAUDE.md, the PR template and the README).

## Acceptance checks
1. The step's own PR shows `ci` passing next to `branch-policy`.
2. A throwaway PR that breaks one existing test (e.g. a readyz test) shows `ci` failing, and the log names the
   failing test. The PR is closed and its throwaway branch deleted.
3. The integration test runs in CI (not skipped), against the service container.
4. A push to `develop` after merge also runs `ci`.
5. `make lint` and `make test` pass locally, as before.

No new tests are added: the existing suite now also runs in CI.

## Default (MOSAIC's way)
One `ci` job on `ubuntu-latest` with `permissions: contents: read`; a `redis:7-alpine` service on
`localhost:6379`; `astral-sh/setup-uv` (pinned to `v10.3.2`, because that action publishes no floating major tag),
which installs Python from `backend/.python-version`; then `make lint` and `make test`. PR #7 was the red
demonstration. After the merge MOSAIC renamed the branch with `_DONE` and learned to wait until GitHub stops listing
the old name before pruning.

Reference: reference/step-04/ (plan.md, changes.txt, files/).

Adapt: nothing domain-specific; check that the pinned action versions exist today.

## Swap notes
Depends on: CI, backend, storage/cache, test runners, linters.

- **Postgres:** the service container is `postgres:<same tag as Compose>` with a health check and a test database;
  the storage URL is set in the job's env.
- **Node or Go backend:** replace the `uv` setup with `actions/setup-node` or `actions/setup-go`, with caching.
- **GitLab CI or another CI:** one pipeline job with the same two commands and the same service image.
- **Public repo or paid plan:** branch protection may require `ci`; keep the written rule anyway.

Must not change:
- CI runs exactly `make lint` and `make test`, not a separate list of commands, so CI and local runs match.
- The CI service uses the same storage image as Compose.
- A red check means "do not merge".
