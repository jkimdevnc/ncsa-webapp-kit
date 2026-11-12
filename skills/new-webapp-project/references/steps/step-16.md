# Step 16: Deploy to the staging cluster (NCSA)

## Goal
Deploy the same manifests to the shared staging cluster with an overlay, reach the app at a public HTTPS hostname,
and run the whole E2E suite against it. This completes Stage 2.

## Required deliverables
- A read-only look at the cluster first, written down: architecture, ingress controller and its TLS setup, hostname
  pattern, how other apps are deployed, how they pull private images, NetworkPolicy support.
- Inputs the user provides (never created by the step): the namespace `<namespace>`, the registry pull secret, the
  hostname `<host>`, and the kubeconfig file outside the repo.
- Base: a **NetworkPolicy** so only `api` pods can reach storage (it is a shared cluster).
- A staging overlay (e.g. `deploy/k8s/overlays/<target>/`):
  - namespace `<namespace>` (the overlay does not create it);
  - the registry images from Step 14, by `sha-<commit>` tag, with the pull secret;
  - an Ingress for `<host>` with TLS from the cluster's issuer: `/api` → `api:8000`, `/` → `web:8080`. Prefer a
    plain Ingress (with controller annotations) over controller-specific resources.
- Make targets, all through one kubectl prefix (kubeconfig path overridable by an env var, explicit context and
  namespace):
  - `<target>-up [TAG=sha-xxxxxxx]`: default tag is `origin/develop`'s commit; render, apply, wait for each rollout,
    then wait until `https://<host>/api/v1/readyz` is ready (which includes the certificate);
  - `<target>-down`: delete only the app's resources; the namespace and the secret stay;
  - `test-e2e-<target>`: the whole E2E suite against `https://<host>`, including the restart and replicas tests.
- `make doctor`: a section for the cluster, skipped when the kubeconfig is missing: the kubeconfig is private
  (mode 600), the cluster answers, the namespace and the pull secret exist.
- Docs: README "Deploy to staging"; `docs/deploy-<target>.md` rewritten to what is known, how to deploy, what is
  open; the deployment ADR gets a dated note (ingress, deploy method, and "revisit when").

## Acceptance checks
1. `make doctor` passes, including the cluster section.
2. `make <target>-up`, then `get pods` shows storage ×1, api ×2, web ×1, Running and Ready.
3. `https://<host>` has a valid certificate, and entry → Analyze → result → run log works.
4. `make test-e2e-<target>` passes the whole suite on the staging cluster.
5. `make test-e2e-k8s` (local), `make test` and `make lint` still pass; the NetworkPolicy is applied locally too.
6. No token or kubeconfig is in the repo; every command is scoped to `<namespace>`; nothing cluster-wide is created.
7. Tests: no new test files; the restart and replicas tests now take the kubectl prefix and URL from env vars, so
   they run on both clusters (a deliberate change if they named the local cluster before; say so in the PR).

## Default (MOSAIC's way)
NCSA cluster `visual-analytics` (Rancher, one amd64 k3s node), Traefik with a `letsencrypt` cert resolver,
hostname `mosaic.staging.platform.visari.org`, namespace `mosaic-staging`, secret `ghcr-pull`, kubeconfig
`~/.kube/ncsa-visual-analytics.yaml` (override `NCSA_KUBECONFIG`). Targets `ncsa-up`, `ncsa-down`,
`test-e2e-ncsa`. Ingress class `traefik`, entrypoint `websecure`. Decision: deploy directly with kubectl from the
Mac, not as a Nucleus Droplet with Argo CD (recorded as "revisit when"). Public, no login. Caddy's `/api` proxy stays
(Compose and the local cluster need it) and is unused here.

Reference: reference/step-16/ (plan.md, changes.txt, files/).

Adapt: `<target>` (default `ncsa`), `<host>`, `<namespace>`, the kubeconfig path, the context name, the pull secret.

## Swap notes
Depends on: deploy target, registry, container/web server, persistence mode, owner/naming.

- **Another ingress controller (nginx, HAProxy, cloud LB):** change only the Ingress class and annotations (TLS issuer,
  redirect); paths stay the same.
- **cert-manager instead of a Traefik resolver:** a `cert-manager.io/cluster-issuer` annotation and a `tls:` block.
- **Argo CD / GitOps:** the overlay stays; `<target>-up` becomes "bump the tag in the GitOps repo"; the E2E target is
  unchanged.
- **Helm:** a `values-<target>.yaml` with the host, tag and pull secret.
- **Postgres:** a managed database or a StatefulSet with a PVC; its credentials come from a cluster Secret the user
  creates.

Must not change:
- The same base as the local cluster; only the overlay differs.
- Never create, change or delete the namespace or the secret; no secrets in the repo.
- `livez`/`readyz` probes, 2 api replicas, non-root, the same E2E files.
