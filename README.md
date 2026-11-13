# ncsa-webapp-kit

A Claude Code skill, `new-webapp-project`, that builds a new web app prototype the way MOSAIC was built:
- 18 small steps (0, 1, 1b, 2–16);
- each step is one plan file, one branch, one PR and one `step-N` tag, and is verified by you.

It is a **recipe plus a reference**:
- [`skills/new-webapp-project/references/steps/`](skills/new-webapp-project/references/steps/) holds the recipe: one contract per step (goal, deliverables,
  acceptance checks, MOSAIC's default way, and swap notes);
- `skills/new-webapp-project/reference/` holds a snapshot of what MOSAIC actually did at each step (see `SOURCE.md`).

The skill adapts the reference to the new project's names, domain and stack. MOSAIC's choices are the defaults, and
any of them can be swapped (for example Postgres instead of Redis, or shadcn for the UI).

## How to view the build steps

The kit builds a project in 18 steps: 0, 1, 1b, 2–16. Stage 1 runs locally, and Stage 2 on Kubernetes.

- **[All 18 steps at a glance](skills/new-webapp-project/references/steps/README.md):** one table per stage. Each row
  shows what the step builds and what you check.
- **[One file per step](skills/new-webapp-project/references/steps/):** each file gives the step's goal, deliverables,
  acceptance checks, default way, and the parts you can swap.

**Ask Claude.** In a Claude Code session opened in your project's folder, type:
- "Show me the steps": all steps, marked ✅ done, ▶ current, ⚠ needs setup or skipped.
- "What's the status?" or "Where are we?": the same tables, for your project.
- "What does Step 7 do?": that step's details and checks.
- "Use the new-webapp-project skill and show me the steps": if Claude doesn't pick up the skill on its own.

## How to use this webapp-kit skill with Claude Code

The kit isn't a plugin yet, so you install it by cloning this repo and linking the skill folder into your personal
Claude Code skills. The repo is private, so you need access to `jkimdevnc/ncsa-webapp-kit` first.

### One-time setup

1. **Have the three tools you need to get started:**
   - Claude Code;
   - `git`;
   - the GitHub CLI `gh`, for the login in the next step.

   **You don't need to install anything else first.** The skill's Step 0 checks the rest of the tool chain: `uv`,
   Node 26, and OrbStack or Docker (OrbStack is needed for the Kubernetes steps). For anything missing, Claude
   proposes the install command and runs it once you approve. A few installs, such as the OrbStack app, may ask for
   your password or a click, and Claude tells you when.
2. **Log in to GitHub** with an account that can see this repo:

   ```bash
   gh auth login
   ```

3. **Clone the kit and stay on `develop`.** `develop` is the default branch, and it has the latest skill.

   ```bash
   git clone https://github.com/jkimdevnc/ncsa-webapp-kit.git ~/ncsa-webapp-kit
   ```

4. **Link the skill into your personal Claude Code skills:**

   ```bash
   mkdir -p ~/.claude/skills && ln -s ~/ncsa-webapp-kit/skills/new-webapp-project ~/.claude/skills/new-webapp-project
   ```

5. **Check that Claude Code sees it.** Start a new Claude Code session and ask "Is the new-webapp-project skill
   available?", or look for it in the skills list.

### Start a new project

6. **Pick or create the GitHub owner for the new repo.** This is your own account or an org. To try the skill out,
   use a throwaway org; you create the org yourself on GitHub.
7. **Open Claude Code in an empty folder:**

   ```bash
   mkdir -p ~/projects/my-app && cd ~/projects/my-app && claude
   ```

8. **Ask for a new project,** for example: *"Start a new project with the MOSAIC framework."* The skill starts on
   its own; you can also name it ("use the new-webapp-project skill").
9. **Answer the interview.** Each question shows a default, which you can accept or change:
   - **The project:** slug, title, one-line description, the name of one record (default "Case"), GitHub owner and
     repo name. At NCSA, avoid a plain "mosaic" name.
   - **The domain:** your input variables, typed in or from a CSV/JSON dictionary file, and the model's outputs, each
     numeric or categorical.
   - **The stack:** keep MOSAIC's defaults (FastAPI, Redis, React) or swap a part, such as Postgres or shadcn.
   - **Versions and deployment values:** NCSA defaults; leave them until Step 14 if you like.

   Review the `project.yaml` it writes, then say OK.
10. **Approve creating the GitHub repo** when it asks, in Step 1.

### The step loop (Steps 0, 1, 1b, 2–16)

11. **For each step, the skill:**
    1. asks whether to keep the default for this step or swap a part;
    2. creates a branch and writes the step's plan file;
    3. builds the step, with tests and `make lint` and `make test` green;
    4. opens a PR and waits for green CI;
    5. stops and tells you what to verify.
12. **Verify the step yourself,** using the commands or clicks it gives you, then say OK. The skill then:
    1. merges the PR;
    2. tags `step-N`;
    3. asks whether to **rename the branch `_DONE`, delete it, or keep it**.
13. **Do the steps only you can do** when it asks:
    - installing tools and `gh auth switch`;
    - turning on Kubernetes in OrbStack (Step 15);
    - for NCSA (Step 16): the namespace, the pull secret made with your own token, and the kubeconfig. The skill
      prints the commands, and you run them.
14. **Stop and resume any time.** Progress is saved in `.framework/state.json`. Open Claude Code in the project
    folder later and say *"Resume the project"*, and it continues from the current step.

### Check where you are

For the full list of steps and example prompts, see [How to view the build steps](#how-to-view-the-build-steps).

At any time, in a session opened in your project's folder, ask in plain words:
- "Show me the steps"
- "What's the status?" or "Where are we?"

Claude then shows all the steps in two tables:
- Stage 1 (local) and Stage 2 (Kubernetes);
- columns **Step**, **What it builds** and **You check**;
- each step marked ✅ done, ▶ current, or ⚠ needs setup or skipped.

It also shows these tables when you resume in a new session, and once after the first interview.

If Claude doesn't use the skill on its own, say "Use the new-webapp-project skill and show me the steps."

### Staying up to date

15. **Get skill updates** by running `git pull` in `~/ncsa-webapp-kit` while it is on `develop`. The symlink means new
    sessions pick up the update at once.
16. **Send feedback.** Note anything the skill got wrong for your project. Those findings go into `ROADMAP.md`
    (item a) through a PR on this repo.

Later, once the kit is packaged as a plugin (ROADMAP item j), steps 3–4 become a single plugin install.

## Working on the kit

**Maintainers:** work in your own clone of the kit, wherever you keep it (for example `~/ncsa-webapp-kit`), and
make sure the `~/.claude/skills/new-webapp-project` symlink points into that clone. `make doctor` checks this.

**Run later kit work in a Claude Code session opened in this folder** (`ncsa-webapp-kit`). Only then does this
repo's `CLAUDE.md` load, with its rule to show the next `ROADMAP.md` items and ask before starting one. A session
opened in `mosaic-prototype` or elsewhere won't see that rule.

- `ROADMAP.md` is the to-do list, done one item at a time.
- `skills/new-webapp-project/references/testing.md` is the master copy of the testing rules. MOSAIC and every
  generated project copy it word for word.
- One-time setup per clone: `make setup` installs the pre-commit hooks. `make lint` and `make doctor` run the checks.

## Git branching rules

Work happens on short-lived branches. Changes reach `develop` only through PRs, and `main` only receives `develop`, at
milestones:

```
feature/…, fix/…, docs/…, chore/… ──PR──► develop ──PR (at milestones)──► main
                                          (default branch)                (releases, tagged vX.Y.Z)
```

- **Merges:** merge commits only.
- **Merged branches:** kept, or renamed `_DONE`.
- **Enforcement:**
  - the pre-commit hook blocks commits on `main` and `develop`;
  - the `branch-policy` check fails a PR from a wrongly named branch.

See `CLAUDE.md`, "Git branching rules".

## Layout

```
README.md, CLAUDE.md, ROADMAP.md, Makefile (setup, lint, doctor), scripts/doctor.sh
.github/              branch-policy workflow, PR template
skills/new-webapp-project/
  SKILL.md            the workflow
  references/         steps/ (contracts), interview, stack, naming, branching, testing
  reference/          the MOSAIC snapshot (SOURCE.md + step-NN/{plan.md, changes.txt, files/})
```
