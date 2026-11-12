# The interview

Ask a few questions at a time (the AskUserQuestion tool works well), and always show the default. Group them as
below. When done, write `project.yaml` at the new repo's root, show it to the user, and wait for an OK before Step 1.

**Why ask everything up front.** Names and the domain run through every step. A change after Step 7 means editing
many files and tests. Stack choices can still change later, just before the step that uses them (see `stack.md`).

## Round 1: the project

| Key | Question | Default |
|---|---|---|
| `slug` | Short lowercase name, used in images, namespaces and keys | none (asked) |
| `title` | Display name | the slug, upper-cased |
| `description` | One line: what the app does | none (asked) |
| `entity` | What one record of entered data is called (MOSAIC: "Workup") | `Case` |
| `owner` | GitHub owner of the repo and images: the user's account or an org | the active `gh` user. When trying the skill out: the user's throwaway org |
| `repo` | Repo name | `<slug>-prototype` |
| `folder` | Local folder for the new repo | next to the current folder, named `<repo>` |

**Naming note** (say it when asking for the slug): at NCSA, avoid a plain "mosaic" name for new projects. Prefer
something distinct, such as `mosaic-msu`, or a name of the project's own.

**Check the owner and repo:** `gh repo view <owner>/<repo>` must fail with "not found". Never reuse an existing repo.

## Round 2: the domain

| Key | Question | Default |
|---|---|---|
| `variables` | The input variables. Either type them in (2–10 is fine for a start), or give a path to a dictionary file (CSV or JSON). | none (asked) |
| `outputs` | What the model returns. One or more outputs, each **numeric** (name, unit) or **categorical** (name, classes). | one numeric and one categorical |

Each variable has these fields:
- `code` (short, unique, upper case);
- `label`;
- `unit`;
- `precision` (decimal places);
- `possible_range` (`min`, `max`, `source`);
- an optional `section`.

**With a dictionary file:** read it, map its columns to these fields, and show the mapping and the first five rows.
List any rows you could not map, and ask before going on. For hundreds of variables, the entry screen groups them by
`section`.

**The model:** a toy model with a fixed seed, over the variables, that returns the outputs. It stays until the
project has a real model, which then goes into the model catalog. Tell the user this.

## Round 3: the stack

Show the stack table from `stack.md`, with MOSAIC's defaults, and ask: "Keep all defaults, or swap something now?"
The user can also swap later, before the step that uses an item. Record every choice under `stack:`.

## Round 4: versions and deployment

| Key | Default |
|---|---|
| `python` / `node` | `3.15` / `26` |
| `namespace` | `<slug>-staging` |
| `host` | `<slug>.staging.platform.visari.org` |
| `kubeconfig` / `kube_context` | `~/.kube/ncsa-visual-analytics.yaml` / `visual-analytics` |
| `pull_secret` | `ghcr-pull` |
| `entrypoint` / `cert_resolver` | `websecure` / `letsencrypt` |

These are the NCSA defaults, and all of them can be overridden. They matter only from Step 14 on, so the user can
leave them as they are and change them before Step 14.

## `project.yaml` shape

```yaml
schema_version: 1
kit_commit: <git rev-parse --short HEAD of ncsa-webapp-kit>
slug: boneage
title: BoneAge
description: Estimate age and sex from bone measurements.
entity: Case
owner: my-throwaway-org
repo: boneage-prototype
variables:
  - {code: FL, label: Femur length, unit: mm, precision: 0, section: Leg,
     possible_range: {min: 300, max: 600, source: placeholder}}
outputs:
  - {name: age, kind: numeric, unit: years}
  - {name: sex, kind: categorical, classes: [female, male]}
stack:            # see stack.md; only swapped items need comments
  persistence: browser-form, server-run, results-in-memory-ttl
  backend: fastapi
  storage: redis-in-memory
  # …
python: "3.15"
node: "26"
deploy: {namespace: boneage-staging, host: boneage.staging.platform.visari.org, kubeconfig: ~/.kube/ncsa-visual-analytics.yaml,
         kube_context: visual-analytics, pull_secret: ghcr-pull, entrypoint: websecure, cert_resolver: letsencrypt}
swaps: []         # one entry per swap: {item, from, to, step, adr}
```
