# Roadmap

v0 is done when the skill is loaded through the symlink and the user has tried it. After that, work through these
items **in order, one at a time, and each only with the user's OK** (see the roadmap rule in `CLAUDE.md`). Check an
item off with the date and the PR.

- [ ] **a. Adjust v0 from the user's try-it findings.**
      Why: real use shows what the contracts and the interview get wrong; fix those before adding more.

  Findings from the first try-it, `webapp-kit-test` (2026-11-12). Item a stays open for later try-its.
  - [x] **The testing rules lacked "fail first" and how to remove a feature.** New rule 6, the `remove` decision, the
    feature-removal row, and the `removed:` and `failed first:` lines. Done in PR #1.
  - [x] **The leftover-name check was too strict.** It flagged an owner that contains a MOSAIC name
    (`jkimdevnc-kit-try`). `naming.md` now filters out the project's own owner and slug. Done in PR #5.
  - [x] **Step 15's port clashed with MOSAIC's cluster.** The suggested `8081` is MOSAIC's own port on the same
    OrbStack. There is now a `local_k8s_port` setting (default `8082`), checked with `lsof`. Done in PR #5.
  - [x] **The snapshot's setup-uv pin was outdated.** `v10.3.2` is pinned in the snapshot, and the trial used
    `v10.3.3`. The Step 4 contract and `SKILL.md` now say to use current releases. Done in PR #5. The snapshot
    itself gets refreshed in item e.
- [ ] **b. Build the testing tools in the kit, and prove them on a generated test project.** There are four tools:
  - the test-guard CI job (path check + weakening guard);
  - diff coverage;
  - `affected_tests.py`;
  - the label hook.

  Why: a machine then checks Claude's test judgment. Proving the tools in the kit first keeps MOSAIC stable.
- [ ] **c. MOSAIC adoption** (done by the MOSAIC session in `mosaic-prototype`, not from here). It has two stages:
  1. [x] right after v0: the testing *rules*, copied word for word from `references/testing.md`. Done 2026-11-13
     in mosaic-prototype PR #23, plus PR #24 (ADR 0005 allows removing a removed feature's tests).
  2. once item b is proven: the testing *tools*.

  Why: MOSAIC and the kit stay identical, with the kit as the source.
- [ ] **d. Back-sync from MOSAIC.** In kit sessions, check MOSAIC for improvements since `reference/SOURCE.md`,
      compare them with the kit, and ask the user before copying anything.
      Why: MOSAIC keeps evolving, and good generic fixes should reach the kit.
- [ ] **e. `dev/refresh_reference.sh` to re-copy `reference/` from MOSAIC.**
      Why: it makes the snapshot refresh repeatable and records the new source commit.
- [ ] **f. A neutral template repo plus `render_step.py`, replacing `reference/`.**
      Why: for unswapped steps, copying tested files is faster and more reliable than adapting them each time.
- [ ] **g. The dependency map, `import_dictionary.py` and `new_domain.py`.**
      Why: they show exactly which steps a swap touches, and make large dictionaries and the toy domain repeatable.
- [ ] **h. Evals: light partial ones first, full and swapped ones later.**
      Why: they measure the skill instead of relying on impressions, while keeping the cost of runs down.
- [ ] **i. `AGENTS.md` for other AI tools.**
      Why: teammates who use other assistants then get the same rules.
- [ ] **j. The plugin and marketplace, when the user decides to share.**
      Why: packaging is only needed once others install it.

---

## Notes for later items

These were worked out while planning, in `~/.claude/plans/mosaic-framework-skill-plan.md`.

### b. The testing tools

- `check_tests.py` reads code-folder → test-folder pairs from `project.yaml`. Deployment changes need an E2E run
  named in "Tests:" rather than a changed spec.
- The weakening guard flags:
  - deleted tests;
  - newly added `.skip`, `.only`, `xfail` or `todo`;
  - fewer `assert`/`expect` lines.

  Note that good refactors (merging tests into one parametrized test, or moving checks into a helper) can trip it.
- `diff-cover` uses a threshold set in `project.yaml` (80% by default). It leaves out generated client files,
  `*.d.ts`, config files and the frontend entry file.
- `affected_tests.py` has one adapter per runner:
  - pytest: coverage contexts or testmon;
  - Vitest: `vitest related`;
  - Playwright: `--only-changed` plus a search.

  If no adapter fits, a manual search is used, and the "Tests:" block says so.
- Only the user adds the labels `no-tests-needed` and `test-change-approved`. A PreToolUse hook blocks adding labels
  but allows `gh label create`.
- The CI job re-runs on `labeled` and `unlabeled`.
- Required status checks are used where branch protection exists.
- The AI review runs locally (`/code-review`, pasted into the PR), not in CI.
- Prove the tools on a generated test project in the throwaway org, with four throwaway PRs:
  - red: a code change with no test change;
  - red: a weakened test;
  - green: once the user adds the label;
  - green: a proper PR.

### f. The template

- working values (`demoapp`) and a substitution table;
- a three-part contract: input JSON → prediction → results JSON, with several numeric or categorical outputs;
- a demo case;
- an optional `section` field in the dictionary schema;
- `GET /api/v1/models`;
- default path = render; swap path = adapt and pass the same acceptance checks;
- its test: "render with toy values gives back the template";
- a manual backport checklist with `template_diff.py`;
- NCSA checked once, in a throwaway namespace.

### g. The dependency map

| Stack item | Steps it touches |
|---|---|
| persistence | 2, 7, 11, 12, 13; frontend-only also 3, 6, 9, 15, 16; desktop replaces 13–16 |
| storage | 2, 3, 7, 13, 15, 16 |
| backend | 3, 5, 6, 7, 9, 13, 14 |
| frontend | 8–13 |
| UI kit | 8, 11, 12 |
| linters | 1, 4, 8 |
| test runners | 3, 8, 10 |
| container | 13, 14 |
| registry | 14, 16 |
| deploy | 15, 16 |
| CI | 4, 14 |
| owner/naming | 1, 14, 16 |

### h. Evals

- Light partial evals first (Steps 1–4, the test guard, the label block), then a try-it checkpoint.
- Full and swapped evals (all defaults, Postgres, shadcn) only after the user confirms the direction. They are capped
  at three full runs, plus at most one rerun each.
- Partial runs start from a repo made at `step-(N-1)`.
- Everything runs on local OrbStack only, in a throwaway org.
- `dev/eval_cleanup.py` lists eval repos, GHCR images and namespaces, and deletes them only with `--confirm` after the
  user's OK. The user adds `delete:packages` to their token themselves.

### Open questions (ask when their item comes up)

- the team's persistence decision;
- whether the UI kit default follows Jackson's shadcn and oxlint after that merge;
- NCSA repo naming: the `ncsa/Mosaic` transfer plan conflicts with the advice to avoid a plain "mosaic" name;
- a CI-based AI reviewer, only if NCSA policy allows it;
- plugin hosting and final names.
