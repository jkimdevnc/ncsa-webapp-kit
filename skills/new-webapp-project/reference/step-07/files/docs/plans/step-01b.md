# Step 1b: Branching model (main / develop / feature branches)

Status: done (PR #1, tag `step-1b`). Rebuilt afterwards from the overview build plan and PR #1.

## Context
Feature work is about to start, so the branching rules come first: `develop` takes the work, `main` takes only
milestones, and every change arrives through a PR. GitHub Free has no branch protection for private repos, so the rules
are enforced by a local hook, a CI check, the PR template and the docs.

## What I build
1. Tag `step-1` on Step 1's last commit and push it.
2. Create `develop` from `main` and push it. This is the only branch created without a PR, since it's the starting
   point.
3. Repo settings via `gh`: default branch `develop`; merge commits only (squash and rebase off).
4. On `chore/branching-model`, small commits:
   - `.pre-commit-config.yaml`: `no-commit-to-branch` for `main` and `develop`.
   - `.github/workflows/branch-policy.yml`: on PRs, fail unless (base `main` and head `develop`) or (base `develop`
     and head `feature/`, `fix/`, `docs/` or `chore/`).
   - `.github/pull_request_template.md`: what and why, tests, `make lint` / `make test`, how to verify.
   - `docs/decisions/0007-branching-model.md`, and the ADR index.
   - `CLAUDE.md` and README: the branching rules and the per-step flow.
   - `scripts/doctor.sh`: default branch is `develop`, `origin/develop` exists, the pre-commit hook is installed.
5. Open the PR into `develop`; merge it with a merge commit after it's verified.

## How you verify
- `gh repo view --json defaultBranchRef` → `develop`.
- `git switch develop && git commit --allow-empty -m test` is blocked by the hook.
- PR #1 shows a green `branch-policy` check. As a demonstration, PR #2 from a branch named `wip-test` shows a red
  check, and is closed.
- On GitHub, the merge button offers only "Create a merge commit".
- `make doctor` → all ✓.

No tests: this step has no features.

## Changes during the step
- Merged branches are **kept**: auto-delete after merge was turned off. Ask before deleting a work branch, or rename it
  with a `_DONE` suffix. `make doctor` checks that auto-delete is off.
- The gh account was pinned in `CLAUDE.md` and checked by `make doctor`. Later, PR #4 (a chore, not a step) moved that
  rule to the git-ignored `CLAUDE.local.md` and made the owner-only doctor checks skip for collaborators who aren't
  admins.
