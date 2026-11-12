# Step 16: Deploy to the NCSA cluster (staging)

Status: done (PR #22, tag `step-16`).

## Context
Step 15 ran MOSAIC on OrbStack's Kubernetes. This step deploys the same manifests to the NCSA cluster
`visual-analytics`, which is managed by Rancher at gonzo-rancher.ncsa.illinois.edu, and runs the E2E suite against
its public URL. That completes Stage 2.

What the cluster showed (read-only look, 2026-10-29):
- **The node and ingress:** one amd64 node (k3s 1.36). Traefik is the default ingress, with a `letsencrypt` cert
  resolver (TLS challenge), and HTTP redirects to HTTPS.
- **Hostnames:** apps live at `*.platform.visari.org`, and the wildcard DNS already resolves
  `mosaic.staging.platform.visari.org`.
- **How other apps are run:** each is a Nucleus "Droplet" (namespace, quota, hostname) plus an Argo CD Application,
  both kept in `ncsa/nucleus-infra`.
- **The other apps' setup:** they pull private GHCR images with a `ghcr-pull` secret. The cluster has no Pod
  Security labels, and NetworkPolicy is supported.

Decisions (2026-10-29, yours):
- **Deploy directly with kubectl from the Mac** (`make ncsa-up`), not as a Nucleus Droplet with Argo CD. Moving to
  the Nucleus way later is recorded in ADR 0006 as a "revisit when".
- **Hostname:** `https://mosaic.staging.platform.visari.org`. **Public, no login**; CILogon stays a later step.
- **Namespace `mosaic-staging` and its `ghcr-pull` secret** already exist; you created them. The step uses them and
  never creates, changes or deletes them.
- **Images:** the multi-arch GHCR images from Step 14, by `sha-<commit>` tag.

## What I build
1. **Base (shared with OrbStack):** a **NetworkPolicy** so that only `api` pods can reach Redis. It's a shared
   cluster, and Redis has no password. OrbStack may not enforce it, and that's harmless.
2. **`deploy/k8s/overlays/ncsa/`:**
   - Namespace `mosaic-staging`. The overlay doesn't create it.
   - Images `ghcr.io/jkimdevnc/mosaic-api` and `mosaic-web`, with `imagePullSecrets: ghcr-pull`.
   - An **Ingress** (class `traefik`) for `mosaic.staging.platform.visari.org`:
     - entrypoint `websecure`;
     - cert resolver `letsencrypt`;
     - `/api` → `api:8000`, and `/` → `web:8080`.
     - It's a plain Ingress rather than Traefik's IngressRoute, so it works with any controller.

     Caddy keeps its `/api` proxy, which Compose and OrbStack still need. Here it's simply unused.
3. **Makefile:**
   - All NCSA commands go through one variable, `kubectl --kubeconfig ~/.kube/ncsa-visual-analytics.yaml --context
     visual-analytics -n mosaic-staging`. The kubeconfig path can be overridden with `NCSA_KUBECONFIG`.
   - `make ncsa-up [TAG=sha-xxxxxxx]`:
     - The default tag is `origin/develop`'s commit, whose images CI has pushed.
     - It renders the overlay with that tag and applies it.
     - It waits for each rollout, then for `https://…/api/v1/readyz` to return ready (which includes the
       certificate being issued).
   - `make ncsa-down`: deletes only the app's resources (the same rendered manifests). The namespace and the secret
     stay.
   - `make test-e2e-ncsa`: the E2E suite against `https://mosaic.staging.platform.visari.org`, including the Redis
     pod restart and the replicas test, on the NCSA context.
4. **E2E (deliberate test change):**
   - `replicas.spec.ts` names the `orbstack` context today. It changes to take the whole kubectl prefix from
     `E2E_KUBECTL`, which replaces `E2E_K8S_NAMESPACE`, so the same test runs on both clusters.
   - The restart command's readyz wait uses the stack's own URL, not `localhost:8081`.
   - What the tests check is unchanged.
5. **`make doctor`:** an "NCSA cluster" section, skipped when the kubeconfig file isn't there. It checks:
   - the kubeconfig file is private (mode 600);
   - the cluster answers;
   - namespace `mosaic-staging` and the `ghcr-pull` secret exist.
6. **Docs:**
   - README: "Deploy to NCSA (staging)".
   - `docs/deploy-ncsa.md`: rewritten from questions into what's known, how to deploy, and what's still open.
   - ADR 0006: a dated note covering the Ingress (Traefik) and the direct kubectl deploy, with "revisit when" the
     app moves to a Nucleus Droplet with Argo CD.

Commits: the plan, then the NetworkPolicy, then the NCSA overlay and make targets, then the E2E changes, then
doctor, then the docs, then the close-out.

**Whole-scope check:**
- **OrbStack:** gets the NetworkPolicy too. `make k8s-up` and `make test-e2e-k8s` are rerun, so the new E2E env
  is checked there as well.
- **Compose and CI:** unchanged. CI never touches the NCSA cluster.
- **Secrets:** no token or kubeconfig ever goes into the repo. The kubeconfig stays in `~/.kube`.
- **Shared cluster:** every command is scoped to `mosaic-staging`. Nothing cluster-wide is created.

**Changes during the step:** none.

**Later (not now):**
- login (CILogon);
- moving to a Nucleus Droplet with Argo CD;
- a production hostname;
- rate limiting the public Analyze;
- pinning images by digest;
- a Redis password.

## How you verify
1. `make doctor`: all ✓, including the NCSA section.
2. `make ncsa-up`, then `kubectl --kubeconfig ~/.kube/ncsa-visual-analytics.yaml --context visual-analytics -n
   mosaic-staging get pods`. It should show redis ×1, api ×2 and web ×1, all Running and Ready.
3. Open https://mosaic.staging.platform.visari.org. It should have a valid certificate, and Workup → Analyze → result
   → run log should work.
4. `make test-e2e-ncsa`: the whole suite passes against NCSA.
5. `make test-e2e-k8s` (OrbStack), `make test` and `make lint` are still green.
