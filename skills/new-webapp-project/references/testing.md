# Testing rules: the canonical master copy

This file is the **single master copy** of the testing rules. Other copies follow it word for word:
- every generated project's `CLAUDE.md` (under "Regression test rules");
- the generated PR template (the "Tests:" block only);
- MOSAIC's `CLAUDE.md`, when MOSAIC adopts these rules (ROADMAP item c).

Change the rules here first.

**How to copy it into a generated project.** Copy everything between the `BEGIN` and `END` markers below into the
project's `CLAUDE.md`, under the heading `## Regression test rules`. In a project with a swapped stack, replace only
the tool names (for example Postgres for Redis, Jest for Vitest, Cypress for Playwright), and the make targets if
they were renamed. Keep every row and rule.

**Why it matters.** The framework's value is a regression suite that grows with every change and is never quietly
weakened. Each rule below closes a common way that regressions slip through: a feature with no test, a test edited to
pass, a fix with no test that reproduces the bug, or a flow tested only at the unit level.

<!-- BEGIN canonical testing rules -->

### 1. Regression rules

1. Every feature change adds or updates tests for that feature.
2. A change is done only when `make test` passes: all earlier tests plus the new ones.
3. Never delete or weaken an existing test to make a change pass. If a past behavior is meant to change, update its
   test deliberately and say so in the commit or PR. If a feature is removed on purpose, remove only the tests of
   that feature, and list them under `removed:` with the reason.
4. Every bug fix gets a test that reproduces the bug.
5. Test what users care about (behavior and contracts), not incidental details such as exact counts that will grow,
   or CSS classes. E2E tests select elements by role and label.
6. Show that each new or updated test checks the change: run it against the code without the change and see it
   fail, then see it pass with the change. If a test can't fail without the change (for example, one that checks
   something is *not* shown), say so in the "Tests:" block.

### 2. Find the affected tests first

Before deciding on new tests, find the existing tests that cover the changed code, and run them before the full
`make test`:

- **pytest:** tests that import or call the changed module or function (search `backend/tests/` for their names).
- **Vitest:** `npx vitest related <changed files>` (run in `frontend/`).
- **Playwright:** specs in `frontend/e2e/` that use the changed routes, labels or API paths.
- **API contract:** if `frontend/openapi.json` changed, every test that calls the changed endpoint.

For each affected test, decide one of these:
- **keep** it: it must still pass unchanged;
- **update** it on purpose: the behavior changed by design, so say why;
- **add** a case to it;
- **remove** it: only when the feature it covers is removed on purpose; say which feature.

### 3. The test-need table

Check this before every commit, and again over the whole PR diff:

| What changed | Tests needed |
|---|---|
| Backend logic, validation, storage, config | a pytest unit test, plus an integration test if the behavior differs with real Redis |
| Frontend component, hook, storage module | a Vitest test |
| A user-visible flow | a Playwright E2E test, added or updated |
| An API contract change | `make gen-api` + `make check-openapi`, plus an E2E test if the flow changes |
| A deployment change (Compose, k8s, images, probes) | an E2E run against that target (`make test-e2e-local-stack`, `make test-e2e-k8s` or `make test-e2e-ncsa`), named in the "Tests:" block |
| A bug fix | always a test that reproduces the bug |
| A feature removed on purpose | remove only that feature's tests, listed under "removed:"; every other affected test still passes |
| Docs only | none, with the reason stated |

### 4. The "Tests:" block

It is required in every commit message that changes tests, and in every PR description:

```
Tests:
- affected: <existing tests that cover the changed code>
- kept: <affected tests that still pass unchanged>
- updated: <tests changed on purpose>, because <reason>
- added: <new tests, with their layer>
- removed: <tests deleted>, because <the feature they covered was removed on purpose>
- failed first: <new and updated tests seen failing without the change, or why one can't>
```

For a docs-only change, the block is one line: "Tests: none needed, because docs only".

<!-- END canonical testing rules -->

## For the PR template

The generated `.github/pull_request_template.md` gets this section. Copy it as is:

```markdown
## Tests

<!-- Required. See "Regression test rules" in CLAUDE.md. For docs only: "Tests: none needed, because docs only". -->

Tests:
- affected:
- kept:
- updated: (because …)
- added:
- removed: (because …)
- failed first:
```

## Not in v0 yet

The machine checks of these rules come in ROADMAP item b:
- the test-guard CI job;
- diff coverage;
- `affected_tests.py`;
- the label hook, with the labels `no-tests-needed` and `test-change-approved` that only the user adds.

Until then, Claude applies the rules above itself, by reviewing each change.
