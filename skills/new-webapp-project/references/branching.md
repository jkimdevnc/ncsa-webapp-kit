# The per-step git flow

This is the same flow MOSAIC used. Following it gives the user one reviewable PR per step and a `step-N` tag to roll
back to.

## The model

```
feature/step-2-redis ──PR──┐
feature/step-3-api ────PR──┼──► develop ──PR (at milestones)──► main
fix/…, docs/…, chore/… ─PR─┘    (default branch)                 (releases, tagged vX.Y.Z)
```

- **`develop`** is the default branch. It receives changes only through PRs from `feature/`, `fix/`, `docs/` or
  `chore/` branches.
- **`main`** receives only `develop`, through a PR, at milestones the user picks. Each of these merges is tagged
  `vX.Y.Z`.
- **Merge method:** merge commits only (squash and rebase are off), so the small commits stay in the history.
- **Merged branches are kept.** Auto-delete is off. Ask before deleting any work branch, since the user may want it
  renamed with a `_DONE` suffix instead.
- **Enforcement** (GitHub Free has no branch protection on private repos):
  - the `no-commit-to-branch` pre-commit hook blocks commits on `main` and `develop`;
  - the `branch-policy` CI check fails a PR from a wrongly named branch;
  - **never merge while any check is red.**

## Special cases: Steps 0, 1 and 1b

- **Step 0** changes no files. It only checks the tools.
- **Step 1** is committed on `main` in small commits, because no `develop` exists yet. It creates the private repo
  with `gh repo create <owner>/<repo> --private`, **after the user's OK** (it is an outward action), and pushes.
  There is no PR. The user verifies, then the commit is tagged `step-1`.
- **Step 1b** creates `develop` from `main` and pushes it. This is the only branch created without a PR. It then sets
  the repo up:

  ```bash
  gh repo edit <owner>/<repo> --default-branch develop \
    --enable-merge-commit --enable-squash-merge=false --enable-rebase-merge=false \
    --delete-branch-on-merge=false
  ```

  The rest of Step 1b goes on `chore/branching-model` with a PR into `develop`, which also exercises
  `branch-policy`.

## Each step from Step 2 on

1. `git switch develop && git pull`, then `git switch -c feature/step-N-<topic>`.
2. **First commit:** `docs/plans/step-NN.md`, written from the step contract, with Status "in progress".
3. Small working commits, each with `make lint` and `make test` green. Messages look like
   `step N: add readyz probe with Redis check`, plus a "Tests:" block when tests change.
4. Push, and open the PR into `develop` early: `gh pr create --base develop`. Use a title like
   `step N: <topic>`, and a body with what and why, how to verify, and the "Tests:" block.
5. Run the contract's acceptance checks. Wait for every CI check to be green.
6. **Last commit, before asking the user to verify:** close out the step plan:
   - Status becomes "done (PR #N, tag `step-N`)";
   - the content matches what was delivered;
   - "Changes during the step" lists only the scope or design changes the user decided, including swaps.
7. **Stop.** Tell the user what to verify (from the contract's acceptance checks), and wait.
8. When the user says OK:
   1. `gh pr merge <N> --merge --subject "Merge PR #<N>: step N <topic>"`, **without** `--delete-branch`;
   2. `git switch develop && git pull && git tag step-N && git push origin step-N`;
   3. ask about the branch, offering three choices:
      - **Rename** it with `_DONE` (`git branch -m`, push the new name, delete the old remote name);
      - **Delete** it (only after a yes);
      - **Keep** it.

## After a step plan is closed

It's final. Later fixes and chores don't touch it. A new plan file comes only with a new workplan step.

## Fix, docs and chore PRs between steps

Use the same flow, with a `fix/`, `docs/` or `chore/` branch. These PRs get no step plan and no `step-N` tag.

## The gh account

If `gh` or `git push` says "Repository not found", the active `gh` account can't see the repo. Ask the user to run
`gh auth switch -u <account>`. Don't switch accounts yourself.
