# Deploying to the NCSA cluster

MOSAIC's staging deployment runs on the NCSA cluster **`visual-analytics`**. Rancher manages the cluster
(gonzo-rancher.ncsa.illinois.edu), and the app is at **https://mosaic.staging.platform.visari.org**. The manifests are
`deploy/k8s/base/` plus `deploy/k8s/overlays/ncsa/`, and `make ncsa-up` applies them from the Mac (Step 16).

## The cluster (as of 2026-10-29)

- **Node:** one amd64 node running k3s 1.36. The images are multi-arch, so amd64 just works.
- **Ingress:** Traefik is the default Ingress controller.
  - Its `letsencrypt` cert resolver issues certificates through a TLS challenge.
  - Plain HTTP is redirected to HTTPS.
- **DNS:** a wildcard covers `*.platform.visari.org`, so a new hostname needs no DNS change.
- **How other apps run:** they use the NCSA **Nucleus** platform. Each app is a `Droplet` (namespace, quota,
  hostname, and optionally a database, Keycloak or a bucket) plus an Argo CD Application, both kept in
  `ncsa/nucleus-infra`.
- **How MOSAIC runs, for now:** it doesn't use that. It is deployed **directly with kubectl**
  (docs/decisions/0006).
- **Security:** NetworkPolicy is enforced. There are no Pod Security labels.

## One-time setup

1. **Get the kubeconfig** from Rancher: the `visual-analytics` cluster → Download KubeConfig. Keep it out of the repo,
   readable only by you:
   ```bash
   mv ~/Downloads/visual-analytics.yaml ~/.kube/ncsa-visual-analytics.yaml && chmod 600 ~/.kube/ncsa-visual-analytics.yaml
   ```
   `make` and `make doctor` look for the file there. Point `NCSA_KUBECONFIG` elsewhere to override.
2. **Create the namespace and the pull secret** by hand. The overlay creates neither, and never changes them. The
   GHCR packages are private, so the secret needs a GitHub token (classic) with only **read:packages**:
   ```bash
   kubectl --kubeconfig ~/.kube/ncsa-visual-analytics.yaml --context visual-analytics create namespace mosaic-staging
   kubectl --kubeconfig ~/.kube/ncsa-visual-analytics.yaml --context visual-analytics -n mosaic-staging \
     create secret docker-registry ghcr-pull --docker-server=ghcr.io --docker-username=<github user> \
     --docker-password=<token with read:packages>
   ```
3. `make doctor`: the "NCSA cluster" checks should all be ✓.

## Deploy, test, remove

```bash
git fetch                    # the default TAG is origin/develop's commit
make ncsa-up                 # or TAG=sha-xxxxxxx for another commit CI built
make test-e2e-ncsa           # the E2E suite against the public URL, including the Redis pod restart
make ncsa-down               # remove the app; the namespace and ghcr-pull stay
```

- **What runs:** `redis` (×1, in memory), `api` (×2) and `web` (×1).
- **Routing:** the Ingress sends `/api` to `api` and `/` to `web`.
- **Redis access:** a NetworkPolicy lets only the `api` pods reach Redis, which has no password.
- **Scope:** every command names the kubeconfig, the `visual-analytics` context and the `mosaic-staging` namespace,
  so nothing else on this shared cluster is touched.

## Still open

- **Who can use it:** the app is public with no login. Login (CILogon) is a later step.
- **How it's deployed:** move to a Nucleus Droplet + Argo CD, like the other apps, which needs a PR to
  `ncsa/nucleus-infra`.
- **Production:** a production hostname and namespace.
- **Hardening:** image pinning by digest, rate limiting the public Analyze, and a Redis password.
