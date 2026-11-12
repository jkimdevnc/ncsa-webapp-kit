# 0006. Two-stage deployment: local first, then Kubernetes

- **Status:** Accepted (2026-10-23)

## Context

MOSAIC will run on an NCSA-managed Kubernetes cluster. Development happens on a MacBook Pro M1 (arm64). The
cluster's requirements (packaging, ingress, TLS, registry, namespace, security rules) are not known yet.

## Decision

- **Stage 1, local:**
  - First the dev servers (uvicorn + Vite, with Redis in Docker Compose).
  - Then the full stack in Docker Compose: Redis + API image + web image (Caddy serves the built frontend and proxies
    `/api`).
  - Stage 1 is done when the whole regression suite passes against the local containers.
- **Stage 2, Kubernetes:** starts only after Stage 1 works.
  - Multi-architecture images (arm64 + amd64) on GHCR.
  - Kustomize manifests as a placeholder until NCSA ops say what they require.
  - First OrbStack's built-in Kubernetes, then the NCSA cluster. In the cluster, an Ingress handles TLS and
    routing, and Caddy only serves static files.
- Stage 1 still follows Kubernetes-friendly habits, so Stage 2 needs no redesign:
  - a stateless API
  - config from env vars, logs to stdout
  - `livez` and `readyz` probes
  - non-root containers
- The demo model is built into the API image. `ARTIFACT_DIR` can point at a mounted volume later.

## Consequences

- Every feature is proven on the Mac before any cluster work, so cluster problems are only deployment problems.
- Some packaging work (Compose, then manifests) is done twice, but both are small.

## Revisit when

- NCSA ops specify packaging or a deploy method (Helm, Argo CD/GitOps, an internal registry such as Harbor).
- Real models are too large to build into the image (move them to a volume or object storage).
- A managed Redis is offered on the cluster.
