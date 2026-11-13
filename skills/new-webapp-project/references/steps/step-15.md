# Step 15: Kubernetes manifests on a local cluster

## Goal
Run the same app on Kubernetes for the first time, on a local cluster, with manifests the staging cluster can reuse
through an overlay. Prove what Kubernetes adds: storage keeps nothing on disk when its pod is deleted, and the API
replicas share storage instead of keeping state of their own.

## Required deliverables
- A **base** of manifests (no namespace, works on any cluster), e.g. `deploy/k8s/base/`:
  - storage Deployment + Service, with the same settings as Compose; under the default mode its data folder is an
    in-memory volume and there is no persistent volume claim; a ping probe; non-root, read-only root filesystem;
  - `api` Deployment (**2 replicas**) + Service + ConfigMap (storage URL, `LOG_LEVEL`, `RESULT_TTL_SECONDS`);
    `livez` for liveness, `readyz` for readiness; requests and limits; non-root, no privilege escalation, all
    capabilities dropped, read-only root filesystem, in-memory `/tmp`;
  - `web` Deployment + ClusterIP Service on 8080; readiness on `/`; non-root.
- A **local overlay** (e.g. `deploy/k8s/overlays/local/`): namespace `<slug>`, the locally built images with no
  pulling (so no pull secret is needed), and `web` exposed on a free local port: `deploy.local_k8s_port` in
  `project.yaml` (default `8082`). Check it first with `lsof -iTCP:<port> -sTCP:LISTEN`. It must clash neither with
  Compose (`8080`) nor with other clusters on the same OrbStack. MOSAIC's own cluster already uses `8081` there, which
  is why the `webapp-kit-test` try-it had to move to `8082`.
- Every kubectl command names the local context explicitly, so nothing touches another cluster.
- Make targets: `k8s-up` (build, apply, restart so new images are used, wait for rollout), `k8s-down` (delete the
  namespace), `test-e2e-k8s` (the E2E suite on the local URL, one worker, with the restart command and the kubectl
  prefix set).
- E2E:
  - the storage-restart test's command for this target: delete the storage pod, wait for the new one, then wait
    until `readyz` passes on the stack's own URL;
  - a new `replicas.spec.ts`, run only when `E2E_KUBECTL` (the full kubectl prefix with context and namespace) is set:
    Analyze once, read the `<entity>` id from the browser, ask **each** api pod directly (`kubectl exec`) for that
    run log, and require the same single run from all of them.
- `make doctor`: a "Kubernetes (local)" section (kubectl installed, the context exists, its node is Ready), shown as
  skipped when the context does not exist.
- Docs: README "Deploy to Kubernetes (local)"; `docs/deploy-<target>.md` with the questions for the staging
  cluster's operators; the deployment ADR gets a dated note on how traffic reaches `web` without an Ingress.

## Acceptance checks
1. `make doctor` passes, including the Kubernetes section.
2. `make k8s-up`, then `get pods` shows storage ×1, api ×2, web ×1, all Running and Ready.
3. The local URL works: entry → Analyze → result → run log.
4. `make test-e2e-k8s` passes the whole suite, including the storage-pod restart and the replicas test.
5. `make test`, `make lint` and `make test-e2e-local-stack` still pass.
6. `make k8s-down` removes everything.
7. Tests added: the replicas E2E test; the restart test runs on Kubernetes (a deliberate test change if its env var
   changed form; say so in the PR).

## Default (MOSAIC's way)
Kustomize under `deploy/k8s/`, OrbStack's cluster (`--context orbstack`), images `mosaic-api:dev` / `mosaic-web:dev`
with `imagePullPolicy: Never`, `web` as a LoadBalancer on `localhost:8081` (no Ingress: OrbStack has none). A new
project uses its own `local_k8s_port` instead, because 8081 is taken whenever MOSAIC's cluster is running.
`E2E_RESTART_REDIS` changed from a flag to a command here, and the test first used `E2E_K8S_NAMESPACE` (Step 16
replaced it with `E2E_KUBECTL`; a new project uses `E2E_KUBECTL` now). Caddy needed the `NET_BIND_SERVICE`
capability kept, because the binary carries it as a file capability. CI does not run Kubernetes.

Reference: reference/step-15/ (plan.md, changes.txt, files/).

Adapt: namespace `<slug>`, image names, the context name.

## Swap notes
Depends on: deploy target, persistence mode, storage, container/web server, registry.

- **Helm instead of Kustomize:** one chart with `values-local.yaml` and `values-<staging>.yaml`; `k8s-up` uses
  `helm upgrade --install`.
- **kind, k3d or Docker Desktop instead of OrbStack:** load images into the cluster (`kind load docker-image`) or
  use a local registry; reach `web` with a port-forward or the cluster's LoadBalancer.
- **Postgres:** a StatefulSet with a PVC (or an external database); the restart test expects the run log to survive.
- **nginx:** drop the capability note; use an unprivileged image.

Must not change:
- Base + overlay split; 2 api replicas; probes; non-root everywhere.
- Every command scoped to an explicit context and namespace.
- `k8s-up`, `k8s-down`, `test-e2e-k8s`; the same E2E files; `E2E_KUBECTL` and the restart-command env var.
