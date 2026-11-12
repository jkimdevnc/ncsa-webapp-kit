# Step 1b: Branching model (main, develop, work branches)

## Goal
Set the branching rules before feature work starts: `develop` takes the work, `main` takes only milestones, and every
change arrives through a PR merged with a merge commit. The rules are enforced by a local hook, a CI check, the PR
template and the docs.

## Required deliverables
- Tag `step-1` on Step 1's last commit, and push it.
- A `develop` branch made from `main` and pushed (the only branch created without a PR).
- Repo settings: default branch `develop`; merge commits only (squash and rebase off); auto-delete of merged branches
  off.
- A pre-commit hook `no-commit-to-branch` for `main` and `develop`.
- A CI workflow `branch-policy` on PRs that fails unless:
  - base `main` and head `develop`, or
  - base `develop` and head `feature/`, `fix/`, `docs/` or `chore/`.
- `.github/pull_request_template.md` with: what and why, how to verify, `make lint` / `make test`, and the
  "Tests:" block copied as is from `references/testing.md`.
- `docs/decisions/0007-branching-model.md` (or the next free number) and the ADR index updated.
- `CLAUDE.md` and README: the branching rules and the per-step flow (branch, plan file, PR, user verifies, merge
  commit, tag `step-N`), "ask before deleting a work branch", and "never merge with a red check".
- `make doctor` checks: default branch is `develop`, `origin/develop` exists, the pre-commit hook is installed,
  merged branches are not auto-deleted. Owner-only checks are skipped for collaborators who are not admins.
- `docs/plans/README.md`, plus `docs/plans/step-00.md`, `step-01.md` and `step-01b.md`. From here on every step
  starts with its plan file (Status "in progress") and ends by closing it out (Status "done (PR #N, tag `step-N`)").
- Personal settings (such as which `gh` account to use) go in a git-ignored `CLAUDE.local.md`.

## Acceptance checks
1. `gh repo view --json defaultBranchRef` shows `develop`.
2. On `develop`, `git commit --allow-empty -m test` is blocked by the hook.
3. The step's own PR (from `chore/branching-model`) shows a green `branch-policy` check.
4. A PR from a badly named branch (e.g. `wip-test`) fails `branch-policy`. It is then closed; the throwaway branch
   may be deleted without asking.
5. The GitHub merge button offers only "Create a merge commit".
6. A new PR opens with the template, including the "Tests:" block.
7. `make doctor` passes, including the new branch checks.
8. After merge: tag `step-1b` on `develop` is pushed.

No feature tests are added: this step has no features.

## Default (MOSAIC's way)
MOSAIC did this as PR #1 from `chore/branching-model`, with small commits: the hook in `.pre-commit-config.yaml`,
`.github/workflows/branch-policy.yml`, the PR template, ADR 0007, CLAUDE.md and README text, and the doctor checks.
PR #2 from `wip-test` showed the red check and was closed. During the step it decided to keep merged branches
(auto-delete off, rename with a `_DONE` suffix instead). Later (PR #4) the `gh` account rule moved to
`CLAUDE.local.md`, and owner-only doctor checks were made to skip for non-admins. A new project should start that way.

Reference: reference/step-01b/ (plan.md, changes.txt, files/).

MOSAIC only added `docs/plans/` in Step 7 and rebuilt the earlier plans then; a new project starts it here.

Adapt: the owner and account name, the ADR number, and the PR numbers.

## Swap notes
Depends on: CI, owner/naming.

- **GitHub plan with branch protection (paid or public repo):** branch protection can be added on top, but keep the
  hook and the `branch-policy` check, so the rules are the same everywhere.
- **GitLab or another host:** `branch-policy` becomes a pipeline job on merge requests; repo settings use that host's
  CLI or API. The PR template becomes a merge-request template with the same "Tests:" block.
- **Org-owned repo:** doctor's owner-only checks need an org admin; keep the "skip for non-admins" behavior.

Must not change:
- The branch names `main` and `develop`, and the prefixes `feature/`, `fix/`, `docs/`, `chore/`.
- Merge commits only; no direct commits to `main` or `develop`.
- Never merge with a red check; ask before deleting a work branch.
- The "Tests:" block in the PR template.
