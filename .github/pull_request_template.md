## What and why

<!-- What this PR changes, and why. Name the ROADMAP item if there is one, e.g. "ROADMAP item a". -->

## How to verify

<!-- Commands or clicks the reviewer can follow to see it working. -->

## Checks

- [ ] `make lint` passes (pre-commit hooks + skill validation)
- [ ] `make doctor` passes (if setup changed)
- [ ] If `references/testing.md` changed: it is still the master copy, and the PR says which copies must follow

## Tests

<!-- Required. See references/testing.md, section 4. For docs only: "Tests: none needed, because docs only". -->

Tests:
- affected:
- kept:
- updated: (because …)
- added:
- removed: (because …)
- failed first:

## Branch rules

- Into `develop`: from `feature/*`, `fix/*`, `docs/*` or `chore/*`, merged with a merge commit.
- Into `main`: from `develop` only, at milestones.
- Do not merge while any check is red.
