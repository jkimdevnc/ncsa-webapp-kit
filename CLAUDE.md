# ncsa-webapp-kit: rules for working on this repo

This repo holds the `new-webapp-project` skill (in `skills/new-webapp-project/`). The skill builds new projects with
the MOSAIC framework recipe. Read `README.md` for the overview.

## The roadmap rule (do this first)

At the start of every session in this repo, and after each of the user's try-its of the skill:
1. show the next unchecked items in `ROADMAP.md` (the first two or three, in order);
2. ask whether to do one of them.

**Never start a roadmap item without the user's OK.** When an item is done, check it off in `ROADMAP.md`, with the
date and the PR (for example `- [x] **a. …** (done 2026-11-20, PR #3)`).

Work outside the roadmap (a typo, a question) doesn't need this, but say if it touches a roadmap item.

## Working rules

- **`skills/new-webapp-project/references/testing.md` is the master copy of the testing rules.** Change the rules
  there first. Every other copy (generated projects, MOSAIC once it adopts them) follows it word for word.
- **`skills/new-webapp-project/reference/` is a snapshot of MOSAIC.** Don't edit it by hand. Refresh it only through
  ROADMAP item e, which records the new source commit in `reference/SOURCE.md`.
- **This session never changes `mosaic-prototype`.** The kit may read MOSAIC (for a refresh or a back-sync, ROADMAP
  items d and e), but MOSAIC's own changes are made in a session opened in that repo.
- Keep `SKILL.md` under 500 lines. Put details in `references/`, and point to them from `SKILL.md`.
- Write the skill's instructions in plain English, and explain *why* rather than relying on bare MUSTs, following the
  skill-creator guidance.
- After changing anything, run `make lint`. It runs the pre-commit hooks and skill-creator's `quick_validate.py` on
  `skills/new-webapp-project`. Run `make doctor` after setup changes. Run `make setup` once per clone.
- Never commit secrets: tokens, kubeconfigs, `.env` files.

## Git branching rules

- **Never commit directly on `main` or `develop`.** The pre-commit hook blocks it.
- **`develop` is the default branch.** It receives changes only through PRs from `feature/`, `fix/`, `docs/` or
  `chore/` branches.
- **`main` receives only `develop`,** through a PR, at milestones the user chooses. Tag each release `vX.Y.Z`.
- The `branch-policy` CI check fails a PR whose source branch breaks these rules. GitHub Free has no branch protection
  on private repos, so the rule is: **never merge a PR while any check is red.**
- Each change:
  1. `git switch develop && git pull`, then `git switch -c <prefix>/<topic>`;
  2. make small working commits (`make lint` passes), with a "Tests:" block as `references/testing.md` says;
  3. push, and open a PR into `develop` early;
  4. the user verifies;
  5. merge with a merge commit (`gh pr merge --merge`, **without** `--delete-branch`).
- **Always ask before deleting a work branch,** locally or on GitHub. The user may want it renamed with a `_DONE`
  suffix instead (e.g. `docs/webapp-kit-test-findings_DONE`). Throwaway test branches can be deleted without asking.
- **Keep the local checkout on `develop` when you are not working on a branch.** The
  `~/.claude/skills/new-webapp-project` symlink serves whatever branch is checked out here, so a half-done branch would
  also change the skill that other sessions load.
