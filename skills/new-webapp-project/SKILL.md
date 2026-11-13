---
name: new-webapp-project
description: Start a new NCSA-style web app prototype using the MOSAIC framework recipe (FastAPI + Redis + React/Vite with a typed OpenAPI client, pytest/Vitest/Playwright, CI, Docker Compose, multi-arch images, Kubernetes on OrbStack and NCSA staging), built step by step with one plan, branch, PR and tag per step, and any stack component swappable. Use this whenever the user wants to start, scaffold, bootstrap or set up a new project "like MOSAIC", a new prototype with the same framework, or asks to resume building such a project, even if they don't name the framework or the skill.
---

# New web app project (the MOSAIC framework recipe)

This skill builds a new project the way MOSAIC was built: in small, verified steps (0, 1, 1b, 2–16). Each step is
its own plan file, branch, PR and `step-N` tag, and you stop for the user to verify it. The result is a working,
tested framework:
- data is entered in the browser;
- Analyze runs a model on the server;
- the result is shown;
- everything runs locally, in Docker Compose and on Kubernetes.

The new project gets its **own names, domain and (if the user wants) stack**.

## What is in this skill

- `references/steps/step-NN.md`: **the recipe.** One contract per step: goal, required deliverables, acceptance
  checks, MOSAIC's default way, and swap notes. The contract is what a step must achieve. Read it first for every
  step.
- `references/steps/README.md`: **the steps at a glance.** All 18 steps in the overview format the user wants (see
  "Showing the steps" below).
- `reference/step-NN/`: **MOSAIC's actual work** for that step, as a snapshot:
  - `plan.md`: MOSAIC's step plan;
  - `changes.txt`: the files added, modified and deleted;
  - `files/`: those files.

  `reference/SOURCE.md` says which MOSAIC commit it came from. Treat it as a worked example to adapt, not a template
  to paste: it carries MOSAIC's names and domain.
- `references/interview.md`: what to ask before Step 1, and the `project.yaml` format.
- `references/stack.md`: the default stack, the swaps, and how to do a swap.
- `references/naming.md`: every MOSAIC name and what it becomes, plus the leftover check.
- `references/branching.md`: the exact git and GitHub flow per step.
- `references/testing.md`: **the testing rules (canonical master copy)**, which go word for word into the new
  project's `CLAUDE.md`.

Never read or change the live MOSAIC checkout. Everything needed is in `reference/`. Keeping to the snapshot means
the skill behaves the same no matter what MOSAIC looks like today.

## Start: new project or resume?

Look for `.framework/state.json` in the current folder, or in the folder the user names.
- **Found:** resume. Read `state.json` and `project.yaml`. Show the steps overview (see "Showing the steps"), say
  what state the current step's PR is in, then continue from there.
- **Not found:** a new project. Run the interview.

## 1. Interview

Follow `references/interview.md`. Ask a few questions at a time, always with defaults:
1. the project: slug, title, description, entity name, owner, repo;
2. the domain: variables, typed in or from a dictionary file, and the model outputs;
3. the stack: keep the defaults or swap;
4. versions and deployment values.

Then:
- write `project.yaml` (show it to the user and get an OK);
- create the local folder with `git init -b main`;
- write `.framework/state.json`:

  ```json
  {"schema_version": 1, "kit_commit": "<sha>", "current_step": "00", "status": "not-started", "pr": null, "swaps": []}
  ```

Update `state.json` at every change of step or status, and commit it with that step's work. It is how a later
session resumes.

Then show the steps overview once, so the user sees the whole road before Step 1.

## Showing the steps

Whenever the user asks for the steps, the plan, the status or "where are we", show the overview from
`references/steps/README.md`, filled in with this project's values and status. Also show it on resume, and once after
the interview.

The format, which the user asked for:
- two tables, Stage 1 (Steps 0–13) and Stage 2 (Steps 14–16);
- three columns: **Step** (number · specific name), **What it builds** (specific files, endpoints and tools) and
  **You check** (①②③ with exact commands, URLs and expected results);
- ✅ done, ▶ current, ⚠ needs setup or skipped.

At each step's own stop, give that step's "You check" list in full.

## 2. The per-step loop

Do the steps in this order: **00, 01, 01b, 02, 03, …, 16**. For each step:

1. **Read** `references/steps/step-NN.md`, and then `reference/step-NN/plan.md` and `changes.txt`.
2. **Confirm the stack for this step.** Name the stack items this step depends on (from the contract's swap notes).
   Ask: "Step N uses X. Keep it, or swap?" Skip the question if no item of the step is open to a swap the user cares
   about. If they swap, follow `references/stack.md`.
3. **Branch** per `references/branching.md`. Steps 0, 1 and 1b are special cases.
4. **Plan file first.** Write `docs/plans/step-NN.md` in the new repo, from the contract and in this project's terms,
   with Status "in progress". Use the same parts as the reference plans:
   - Context;
   - What I build;
   - Tests added;
   - How you verify;
   - Changes during the step.

   Commit it as the step's first commit.

   **Exception for Steps 0 and 1:** they have no plan file of their own when they happen. Step 1b adds
   `docs/plans/` and writes the plans for Steps 0, 1 and 1b, as its contract says. From Step 2 on, the plan always
   comes first.
5. **Build** from `reference/step-NN/files/`, adapting each file:
   - **names:** follow `references/naming.md`;
   - **domain:** variables, outputs, entity and the toy model come from `project.yaml`;
   - **swaps:** follow the contract's swap notes and `references/stack.md`;
   - **files deleted** in `changes.txt`: delete them too, unless the project never had them;
   - **files changed in a later MOSAIC step:** take only what this step needs, and leave later behavior for its own
     step.

   Use the reference as a strong default: it is code that already passed this step's checks. Its versions of
   actions, images and tools date from the snapshot (see `reference/SOURCE.md`). Use current releases instead,
   for example the latest `astral-sh/setup-uv`.

   Don't copy MOSAIC's lockfiles or generated API files. Install with `uv sync` / `npm install`, and generate with
   `make gen-api`, so they match this project.
6. **Test as you go.** Before every commit, follow `references/testing.md`:
   1. find the affected tests;
   2. apply the test-need table;
   3. run `make lint` and `make test`;
   4. add a "Tests:" block when tests change.

   Make small commits (`step N: <what>`) and push them. Open the PR early, with a "Tests:" block.
7. **Check the step.** Run every acceptance check in the contract:
   - `make doctor` where setup changed;
   - from Step 13 on, the stack E2E run (`make test-e2e-local-stack`, `make test-e2e-k8s`, `make test-e2e-ncsa`);
   - the naming leftover check.

   Wait until every CI check on the PR is green. **Never ask the user to verify, and never merge, while a check is
   red.**
8. **Close out the plan** (Status "done (PR #N, tag `step-N`)", matching what was delivered), as the last commit.
9. **Stop for the user.** Tell them, briefly:
   - what the step delivered;
   - the PR link;
   - the acceptance checks you ran, and their results;
   - what to verify themselves, as commands or clicks taken from the contract;
   - any swap or judgment call.

   Then wait.
10. **On their OK:** merge, tag `step-N`, and ask Rename `_DONE` / Delete / Keep for the branch (see
    `branching.md`). Update `state.json`, then go to the next step.

**If a check fails,** fix the cause on the branch. Never weaken or skip a test to get green (see the regression
rules). If the fix needs a decision (a design change, a different tool, a test changed on purpose), ask the user.
Note in the step's summary anything in the reference that was wrong or MOSAIC-specific; it is useful feedback for the
kit (ROADMAP item a).

## 3. Where you always stop for the user

Besides the stop at the end of every step, stop for the things only the user can do or decide:

- **Installing tools (Step 0).** Ask before each install.
- **`gh auth` problems.** The user switches accounts with `gh auth switch -u <account>`.
- **Creating the GitHub repo (Step 1).** It is an outward action, so get an explicit OK first.
- **Turning on Kubernetes in OrbStack (Step 15).**
- **NCSA access (Step 16):**
  - creating the namespace;
  - the `<pull_secret>` docker-registry secret, made with the user's own token that has only `read:packages`;
  - the kubeconfig downloaded from Rancher.

  Print the exact commands for these. The user runs them, because they involve credentials. Never handle tokens
  yourself.
- **Any deletion** (branches, repos, images): ask first.
- **Any decision the contract leaves open**, or anything that changes the design.

## 4. The new project's CLAUDE.md

Step 1 writes `CLAUDE.md`, adapted from `reference/step-01/files/CLAUDE.md`. Later steps grow it as MOSAIC's did.
It must contain:
- the project intro and the stage plan;
- the working style and the branching rules (Step 1b adds the branching section);
- **"Regression test rules"**: the block between the `BEGIN` and `END` markers in `references/testing.md`, copied
  word for word, with tool names changed only for swapped components;
- the current design (the default persistence mode, stated plainly, or the swapped one);
- the swap-points table, with names for this project.

Step 1b's PR template gets the "Tests" section from `references/testing.md`.

**Why it must be word for word.** The generated project outlives this skill. Later Claude sessions in that repo read
only its own `CLAUDE.md`, so the rules have to be there in full.

## 5. When all steps are done

After Step 16 is merged and tagged:
- `state.json` status becomes `"done"`;
- tell the user the framework is complete;
- list the tags and the swaps;
- point to `docs/plans/` for the history.

Suggest a first milestone PR from `develop` into `main` (tagged `v0.1.0`) only if the user wants one.

## Tone and pace

The user verifies every step, so keep each stop short and concrete: what changed, what you checked, and what they
should try. Use plain language. When something in this skill seems wrong for this project, say so and ask, rather
than forcing MOSAIC's way.
