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
- After changing `SKILL.md`, run skill-creator's `quick_validate.py` on `skills/new-webapp-project`.
- Work on a branch (`feature/`, `fix/`, `docs/`, `chore/`), with a PR into `main`. Use merge commits, and ask before
  deleting a branch.
- Never commit secrets: tokens, kubeconfigs, `.env` files.
