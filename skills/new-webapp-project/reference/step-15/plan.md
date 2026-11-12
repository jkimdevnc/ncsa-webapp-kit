# Step 15: Kubernetes manifests on OrbStack's local cluster

Status: done (PR #21, tag `step-15`).

## Context
Step 14 put multi-arch images on GHCR. This step runs the same app on Kubernetes for the first time, on OrbStack's
built-in cluster on the Mac. NCSA (Step 16) can then reuse the manifests with only an overlay for its cluster. The
E2E suite runs against the cluster, and two new checks prove what Kubernetes adds: Redis keeps nothing on disk when
its pod is deleted, and the 2 API replicas share Redis, so neither keeps state of its own. No application code
changes.

Decisions (2026-10-29):
- **Images come from local builds.** OrbStack's Kubernetes uses the Mac's Docker images (`mosaic-api:dev`,
  `mosaic-web:dev`, the same ones Compose builds) with `imagePullPolicy: Never`, so `make k8s-up` deploys the current
  code and needs no pull secret. Pulling from GHCR with a pull secret comes in Step 16.
- **No Ingress yet.** OrbStack has no Ingress controller, and ingress-nginx was retired in 2026. `web` is a
  LoadBalancer Service at **http://localhost:8081**, which doesn't clash with Compose on 8080. Caddy keeps passing
  `/api` to the `api` Service, as in Compose. The Ingress, with NCSA's controller and TLS, comes in Step 16. ADR 0006
  gets a dated note saying so.
- **Every kubectl command passes `--context orbstack`**, so nothing ever changes or touches another cluster.
- **CI doesn't run Kubernetes.** The gate is local: `make test-e2e-k8s`. `ci`, `stack`, `images` and `smoke` stay
  as they are.

## What I build
1. **`deploy/k8s/base/`** (Kustomize, no namespace, works on any cluster):
   - **`redis`** Deployment + Service:
     - The same flags as Compose: `--save ""`, `--appendonly no`, `--maxmemory 256mb`, `volatile-ttl`.
     - `/data` is an in-memory `emptyDir` (`medium: Memory`), with no PersistentVolumeClaim.
     - The `redis-cli ping` probe.
     - Non-root (uid 999), read-only root filesystem.
   - **`api`** Deployment (2 replicas) + Service + ConfigMap:
     - The ConfigMap holds `REDIS_URL=redis://redis:6379/0`, `LOG_LEVEL` and `RESULT_TTL_SECONDS`.
     - Probes: `livez` for liveness and `readyz` for readiness.
     - Resource requests and limits.
     - Runs as uid 10001 with no privilege escalation, all capabilities dropped, a read-only root filesystem, and
       `/tmp` as an in-memory `emptyDir`.
   - **`web`** Deployment + ClusterIP Service on 8080:
     - Caddy's default upstream is `api:8000`, which is the Service name, so it needs no env.
     - Readiness probe on `/`; non-root.
     - Keeps the `NET_BIND_SERVICE` capability: the caddy binary carries it as a file capability and won't start
       without it. Caddy listens on 8080, so the capability is never used.
2. **`deploy/k8s/overlays/local/`**:
   - Namespace `mosaic`.
   - Images `mosaic-api:dev` and `mosaic-web:dev` with `imagePullPolicy: Never`.
   - `web` Service set to `type: LoadBalancer`, port 8081.
3. **Makefile:**
   - `k8s-up`: `docker compose build`, `kubectl apply -k deploy/k8s/overlays/local`, then a rollout restart (so the
     rebuilt `:dev` images are picked up), and wait until the rollout is done.
   - `k8s-down`: delete the `mosaic` namespace.
   - `test-e2e-k8s`: the E2E suite with `BASE_URL=http://localhost:8081`, one worker, plus the two env vars below.
4. **E2E:**
   - **Redis restart, made to work on any stack (a deliberate test change):** `E2E_RESTART_REDIS` changes from a
     flag (`1`) to *the command that restarts this stack's Redis*:
     - `make test-e2e-local-stack` and the CI `stack` job pass `docker compose restart redis`.
     - `make test-e2e-k8s` passes "delete the redis pod, wait for the new one, then wait until readyz passes". The
       redis Service reaches the new pod 2–3 seconds after it's Ready, and until then readyz returns 503 and
       Analyze returns 500.
     - What the test checks doesn't change: the run log is empty, and the Workup is still in the browser.
   - **New `replicas.spec.ts`** (runs only when `E2E_K8S_NAMESPACE` is set):
     1. Analyze once in the page.
     2. Read the Workup id from the browser.
     3. Ask **each** api pod directly, using `kubectl exec` with the image's Python, for that Workup's run log.
     4. Both pods must return the same single run.

     This checks every pod, rather than hoping the load balancer spreads the requests.
5. **`make doctor`:** a "Kubernetes (OrbStack)" section, with these checks:
   - kubectl is installed.
   - The `orbstack` context exists.
   - Its node is Ready.
   - If no `orbstack` context exists, the section shows as skipped, so doctor stays green for anyone not doing
     Stage 2.
6. **Docs:**
   - README: "Deploy to Kubernetes (OrbStack)", covering enabling it once, `make k8s-up`, `kubectl get pods`, the
     URL, `make test-e2e-k8s` and `make k8s-down`.
   - `docs/deploy-ncsa.md`: the NCSA ops questions from the overview plan, plus what the base manifests already assume.
   - ADR 0006: the dated note about the Ingress.

Commits: the plan, then the manifests and make targets, then the E2E changes, then doctor, then the docs, then the
close-out. A PR into `develop` opens early.

**Whole-scope check:**
- **CI `stack` job:** it runs `make test-e2e-local-stack`, so it gets the new `E2E_RESTART_REDIS` value through the
  Makefile, and the job itself doesn't change.
- **Compose:** not changed.
- **Tests:** without `E2E_K8S_NAMESPACE`, the replicas test is skipped everywhere else.
- **The images:** unchanged.
- **NCSA (Step 16):** gets its own overlay. It changes the image source to GHCR with a pull secret, and adds the
  Ingress and TLS.

**Changes during the step:** none.

**Later (not now):** an Ingress (Step 16), running Kubernetes in CI (with kind), a NetworkPolicy, a
PodDisruptionBudget, a HorizontalPodAutoscaler, and a password on Redis.

## How you verify
1. Once: OrbStack → Settings → Kubernetes → Enable. Then `kubectl config get-contexts` lists `orbstack`.
2. `make doctor`: all ✓, including the new Kubernetes section.
3. `make k8s-up`, then `kubectl --context orbstack -n mosaic get pods`. It should show redis ×1, api ×2 and web ×1,
   all Running and 1/1 Ready.
4. Open http://localhost:8081: Workup → Analyze → result → run log.
5. `make test-e2e-k8s`: the whole suite passes, including the Redis-pod restart and the 2-replica test.
6. `make test` and `make lint` are green, and `make test-e2e-local-stack` still passes against Compose.
7. `make k8s-down` removes everything.
