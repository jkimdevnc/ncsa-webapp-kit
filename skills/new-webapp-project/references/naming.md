# Renaming MOSAIC's names to the new project's

The files in `reference/` are MOSAIC's real files. Every MOSAIC name in them must become the new project's value from
`project.yaml`. Use this table as a checklist when adapting each file. Search the adapted files afterwards with the
command at the end.

**Why it matters.** A leftover `mosaic` breaks things in the new project:
- image pulls from the wrong registry;
- Redis keys that clash with another app's;
- an Ingress host that points at MOSAIC.

It also confuses the next reader.

## Names and values

| In MOSAIC | Becomes | Where it shows up |
|---|---|---|
| `MOSAIC` (display name) | `<Title>` | README, CLAUDE.md, ADRs, FastAPI `title`, `<title>`, `<h1>` |
| `mosaic` (slug) | `<slug>` | Docker user, Compose image names, k8s labels, the Ingress name, the Docker network |
| `mosaic-prototype` | `<repo>` | README, doctor, docs |
| `mosaic:` (Redis key prefix) | `<slug>:` | `store.py`, tests, docs |
| `mosaic:workup` (localStorage key) | `<slug>:<entity>` | `workupStore.ts` and its tests |
| `mosaic` / `mosaic.analyses` (logger names) | `<slug>` / `<slug>.analyses` | `main.py`, `analyses.py` |
| `mosaic-backend`, `mosaic-frontend` | `<slug>-backend`, `<slug>-frontend` | `pyproject.toml`, `package.json` |
| `mosaic-api`, `mosaic-web` | `<slug>-api`, `<slug>-web` | Compose, `images.yml`, k8s manifests, Makefile |
| `jkimdevnc` (gh account, GHCR owner) | `<owner>` | `images.yml`, the ncsa overlay, README, doctor |
| `mosaic` (OrbStack namespace) | `<slug>` | the local overlay, Makefile |
| `mosaic-staging` | `<namespace>` | the ncsa overlay, Makefile, doctor, `deploy-ncsa.md` |
| `mosaic.staging.platform.visari.org` | `<host>` | the ncsa Ingress, Makefile, README, docs |
| `visual-analytics`, `~/.kube/ncsa-visual-analytics.yaml` | `<kube_context>`, `<kubeconfig>` | Makefile, doctor, docs |
| `ghcr-pull`, `websecure`, `letsencrypt` | `<pull_secret>`, `<entrypoint>`, `<cert_resolver>` | the ncsa overlay, docs |
| `E2E_RESTART_REDIS`, `redis-restart.spec.ts` | `E2E_RESTART_STORAGE`, `storage-restart.spec.ts` (storage-neutral names, used from the start) | Makefile, Playwright specs |
| `E2E_K8S_NAMESPACE` (Step 15 only) | `E2E_KUBECTL` (MOSAIC's final form, from Step 16) | Makefile, `replicas.spec.ts` |
| `ncsa-up`, `ncsa-down`, `test-e2e-ncsa` | `<target>-up`, `<target>-down`, `test-e2e-<target>` (`<target>` defaults to `ncsa`) | Makefile, docs |

## The domain (from the interview, not a text swap)

These are not simple renames. Rewrite them from `project.yaml`, following `steps/step-05.md`, `step-06.md`,
`step-11.md` and `step-12.md`.

| In MOSAIC | Becomes |
|---|---|
| `Workup` / `workup` / `workups` / `WORKUP_ID_PATTERN` | `<Entity>` / `<entity>` / `<entity>s` / `<ENTITY>_ID_PATTERN` (routes, components, test labels, keys) |
| GOL, NOL, BNL, XCB and their ranges (`dictionary_v0.json`) | the interview's variables |
| `cranial-demo`, `cranial_demo.joblib`, `train_demo_model.py` (cranial index) | `<slug>-demo`, a toy model over the interview's variables, with a fixed seed |
| outputs `cranial_index` and `class` ("mesocranic") | the interview's outputs, each numeric or categorical |
| "skeletal analysis", "Cranium", "measurements" | the project's one-line description and wording |
| test values (183, 140, 76.5, mesocranic) | values computed from the toy model, kept in one shared fixture where possible |

## Remove or rewrite, not rename

- **References to MLStopping, Figma and "the PI".** Remove them, or replace them with the new project's own sources,
  if the user named any.
- **"MacBook Pro M1".** Keep the arm64 + amd64 rule. Name the user's own machine only if they said what it is.
- **ADR 0003 ("form data in the browser").** Keep it under the default persistence mode, with the entity renamed.
  Rewrite it if the persistence mode was swapped.
- **The `make doctor` check "private + template".** In a generated project it becomes "private", because generated
  projects are not templates. The exception is when the user asked for one.
- **`docs/plans/step-NN.md`.** Never copy MOSAIC's plans. Write each plan new, from the step contract.

## Leftover check

Run this after each step, from the new repo's root:

```bash
OWNER=<owner>; SLUG=<slug>   # from project.yaml
grep -rniE 'mosaic|jkimdevnc|workup|cranial|mesocranic|MLStopping' \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv . \
  | grep -viF -e "$OWNER" -e "$SLUG" || echo "clean"
```

The last filter drops lines that contain the project's own owner or slug. It is needed because those values can
contain a MOSAIC name. In the BoneAge trial, for example, the owner was `jkimdevnc-kit-try`, and without the filter
every line naming it was flagged and had to be accepted by hand.

Every remaining hit must be fixed. When the owner or slug *does* contain a MOSAIC name, also take one quick look at
the lines the filter dropped (run the grep without the last filter): a single line can hold both the user's value and
a real leftover. Say what you found in the step's summary.

`visual-analytics` is not in the pattern. It is the NCSA cluster's context name, a deploy default the project keeps
on purpose. Two kinds of remaining hits are fine, as long as you say so in the summary:
- plan files or docs that mention MOSAIC as the source of a decision (for example "MOSAIC added this in a later
  review");
- notes about sharing OrbStack with MOSAIC's cluster.
