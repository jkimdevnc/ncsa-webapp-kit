# Step 4: CI on GitHub (the regression suite runs automatically from here on)

Status: done (PR #6, tag `step-4`). Rebuilt afterwards from the overview build plan and PR #6.

## Context
Until now, `make lint` and `make test` ran only when someone remembered to run them on the Mac. From this step on,
they run on every PR into `develop` or `main` and on every push to them. GitHub Free can't block a merge on a
private repo, so the rule "never merge a PR with a red check" is ours to keep (CLAUDE.md, the PR template, the README).

## What I build
1. **`.github/workflows/ci.yml`**: one `ci` job on `ubuntu-latest`, with `permissions: contents: read`.
   - A Redis service container (`redis:7-alpine`, the same image as `docker-compose.yml`) on `localhost:6379`, so the
     integration test runs in CI exactly as it does locally.
   - `astral-sh/setup-uv` with its cache on; it installs Python 3.15 from `backend/.python-version`.
   - Steps: `make lint`, then `make test`.
   - No Node yet; Step 8 adds it with the frontend.
2. **README**: a "CI" section.

No new tests: the existing suite now also runs in CI.

## How you verify
- **Green:** PR #6 shows `ci` ✓ next to `branch-policy` ✓.
- **Red (demonstration):** a throwaway PR (#7) breaks one readyz test; its `ci` check goes ✗ and the log names the
  failing test. It is then closed and its branch deleted.

## Changes during the step
- `setup-uv` is pinned to `v10.3.2`, because that action publishes no floating major tag.
- After the merge, the branch was renamed to `feature/step-4-ci_DONE`. A fetch run too soon after the rename brought
  back the old name locally. Lesson: wait until GitHub stops listing the old name, then prune, then check GitHub,
  `origin/…` and the local branches.
