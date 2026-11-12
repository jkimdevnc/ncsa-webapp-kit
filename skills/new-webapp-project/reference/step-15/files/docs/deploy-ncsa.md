# Deploying to the NCSA cluster (Step 16)

Step 16 deploys MOSAIC to the NCSA-managed Kubernetes cluster. It starts once NCSA ops answer the questions below.
Until then, `deploy/k8s/base/` is a placeholder that runs on any cluster, and `deploy/k8s/overlays/local/` runs it on
OrbStack's Kubernetes (see the README).

## Questions for NCSA ops

1. **Packaging and deploy method:** Kustomize, Helm, or Argo CD/GitOps?
2. **Ingress:** which controller or ingress class, the hostname, and TLS (cert-manager?).
3. **Registry:** may the cluster pull from GHCR (`ghcr.io/jkimdevnc/mosaic-api` and `mosaic-web`, private, amd64 +
   arm64), or must images go to an internal registry such as Harbor?
4. **Namespace and access:** our namespace, and how we get a kubeconfig and which RBAC rights.
5. **Security and resources:** the required securityContext, resource requests and limits, quotas, and whether a
   NetworkPolicy is required.
6. **Secrets:** how they're managed (Kubernetes Secrets, Vault, sealed secrets?). Today the app needs none, apart from
   a GHCR pull secret.
7. **Redis:** is there a managed Redis, or do we run our own? Ours keeps everything in memory, with nothing on disk.

## What the base manifests already assume

- **Three Deployments:** `redis` (1 replica, no PersistentVolumeClaim), `api` (2 replicas, stateless) and `web`
  (Caddy).
- **Every container:**
  - runs as non-root, with no privilege escalation and all capabilities dropped;
  - has resource requests and memory limits.
- **Read-only root filesystems:**
  - `api` and `redis` have one, with in-memory `emptyDir` volumes for `/tmp` and `/data`.
  - `web` doesn't have one yet.
- **Health checks:** `api` has `livez` (liveness) and `readyz` (readiness, which checks Redis and the model).
- **Config** comes from env vars, in the `api` ConfigMap. **Logs** go to stdout.
- **Routing:** `web` passes `/api` to the `api` Service. Once the Ingress exists, it can route `/api` to `api` and
  `/` to `web` itself.
- **Images** are the multi-arch images CI pushes to GHCR, tagged `sha-<commit>` and `develop`.

## What the NCSA overlay will add

A `deploy/k8s/overlays/ncsa/` overlay, or a Helm chart or GitOps app if ops require one. It will add:
- the namespace;
- the image source and the pull secret;
- the Ingress with TLS;
- anything ops ask for in the answers above.
