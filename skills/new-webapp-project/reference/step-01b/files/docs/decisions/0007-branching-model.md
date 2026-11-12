# 0007. Branching model: main, develop and feature branches

- **Status:** Accepted (2026-10-26)

## Context

The prototype grows in small steps and will be changed often. Releases (for demos, PI reviews, and later the
Kubernetes deployment) need a stable branch that only ever holds verified work.

## Decision

```
feature/step-2-redis ──PR──┐
feature/step-3-api ────PR──┼──► develop ──PR (at milestones)──► main
fix/…, docs/…, chore/… ─PR─┘    (default branch)                 (releases, tagged vX.Y.Z)
```

- **`main`** holds releases. It receives merges only from `develop`, through a PR, at milestones (a few verified
  steps, the end of a stage, or before a demo or PI review). Each merge into main is tagged `vX.Y.Z`.
- **`develop`** is the default branch. It receives merges only through PRs from `feature/*`, `fix/*`, `docs/*` or
  `chore/*` branches.
- **Work branches** start from `develop`, e.g. `feature/step-2-redis`. Small working commits are pushed as they
  happen, and the PR into `develop` is opened early.
- **Merge commits only** (squash and rebase are disabled), so the small commits stay in history, grouped under one
  merge per branch.
- **Merged work branches are kept** (automatic deletion is off). After a merge, the owner decides whether to delete
  the branch or rename it with a `_DONE` suffix (e.g. `feature/step-2-redis_DONE`) to keep it for later reference.
  Throwaway test branches can be deleted freely.
- **Tags:** `step-N` on develop once a step is verified; `vX.Y.Z` on main at each release.

Enforcement, since GitHub Free has no branch protection for private repositories:

- the pre-commit hook `no-commit-to-branch` blocks commits directly on `main` and `develop`.
- the CI workflow `branch-policy` fails PRs from the wrong kind of branch.
- the rule "never merge while a check is red", written in `CLAUDE.md` and the PR template.

## Consequences

- `main` is always a known good release; `develop` always holds verified, merged work.
- Without branch protection, the merge button is not locked; the checks warn, and people must follow them.

## Revisit when

- The repo moves to an organization on the GitHub Team plan, or the account upgrades to Pro: then add real branch
  protection rules (required PRs, required checks).
- Urgent fixes to a release are needed: then add `hotfix/*` branches from `main`, merged back into both `main` and
  `develop`.
