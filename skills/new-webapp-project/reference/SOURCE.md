# Where this reference snapshot came from

- **Source repo:** `jkimdevnc/mosaic-prototype`
- **Source commit:** `2d2bbf3` (tag `step-16`, "Merge PR #22: step 16 deploy to the NCSA cluster (staging)")
- **Taken on:** 2026-11-11, with read-only git commands (`git diff --name-status`, `git archive`). Nothing in MOSAIC
  was checked out or changed.

## What each `step-NN/` folder holds

- `plan.md`: MOSAIC's `docs/plans/step-NN.md`, taken from tag `step-16`. Some plans were added after their own step.
- `changes.txt`: the output of `git diff --name-status --no-renames A B` for that step (`A` added, `M` modified, `D`
  deleted).
- `files/`: the added and modified files, as they are at tag `B`.

| Step | A → B |
|---|---|
| 00 | none (tools only; `plan.md` only) |
| 01 | empty tree → `step-1` (every file at `step-1`) |
| 01b | `step-1` → `step-1b` |
| 02 | `step-1b` → `step-2` |
| 03–16 | `step-(N-1)` → `step-N` |

The fix and docs PRs between tags show up in the next tag's diff:
- PR #4 (make doctor and CLAUDE.md work for any collaborator);
- PRs #10–#11 (step plans in `docs/plans`);
- PR #19 (the 10 code-review fixes).

## Left out

- lockfiles (`package-lock.json`, `uv.lock`): regenerate them in the new project;
- generated API files (`frontend/openapi.json`, `frontend/src/api/schema.d.ts`): regenerate them with `make gen-api`;
- `CLAUDE.local.md` and `.claude/`: personal settings;
- anything git-ignored (model artifacts, `.env`): never committed.

## Refreshing

Do not edit these files by hand. They are MOSAIC's history. To refresh the snapshot from a newer MOSAIC, use
ROADMAP item e (`dev/refresh_reference.sh`). It records the new source commit here.
