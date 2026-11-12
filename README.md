# ncsa-webapp-kit

A Claude Code skill, `new-webapp-project`, that builds a new web app prototype the way MOSAIC was built:
- 18 small steps (0, 1, 1b, 2–16);
- each step is one plan file, one branch, one PR and one `step-N` tag, and is verified by you.

It is a **recipe plus a reference**:
- `skills/new-webapp-project/references/steps/` holds the recipe: one contract per step (goal, deliverables,
  acceptance checks, MOSAIC's default way, and swap notes);
- `skills/new-webapp-project/reference/` holds a snapshot of what MOSAIC actually did at each step (see `SOURCE.md`).

The skill adapts the reference to the new project's names, domain and stack. MOSAIC's choices are the defaults, and
any of them can be swapped (for example Postgres instead of Redis, or shadcn for the UI).

## Load the skill (personal, through a symlink)

```bash
ln -s /Users/jkm/DATA2/TASKS/MOSAIC/git/ncsa-webapp-kit/skills/new-webapp-project ~/.claude/skills/new-webapp-project
```

Start a new Claude Code session and check that `new-webapp-project` is listed among the skills. Edits in this repo
take effect in new sessions straight away.

## Try it

1. Create a throwaway GitHub org for trying it out (creating an org is something you do yourself).
2. Open a Claude Code session in an empty folder, for example `~/tmp/try-kit`. Ask: "Start a new project with the
   MOSAIC framework".
3. Give your throwaway org as the owner. Go through Steps 1–4 first, then as far as you like.

## Working on the kit

**Run later kit work in a Claude Code session opened in this folder** (`ncsa-webapp-kit`). Only then does this
repo's `CLAUDE.md` load, with its rule to show the next `ROADMAP.md` items and ask before starting one. A session
opened in `mosaic-prototype` or elsewhere won't see that rule.

- `ROADMAP.md` is the to-do list, done one item at a time.
- `skills/new-webapp-project/references/testing.md` is the master copy of the testing rules. MOSAIC and every
  generated project copy it word for word.

## Layout

```
README.md, CLAUDE.md, ROADMAP.md
skills/new-webapp-project/
  SKILL.md            the workflow
  references/         steps/ (contracts), interview, stack, naming, branching, testing
  reference/          the MOSAIC snapshot (SOURCE.md + step-NN/{plan.md, changes.txt, files/})
```
