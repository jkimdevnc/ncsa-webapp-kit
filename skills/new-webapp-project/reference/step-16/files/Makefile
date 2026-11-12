# Everyday commands. `make help` lists them.
#
# Two kinds of checks:
#   make doctor  - setup checks (tools, repo, services). Not feature tests.
#   make test    - the feature regression suite. Every feature step adds to it.

.DEFAULT_GOAL := help
.PHONY: help setup doctor model gen-api lint test test-fast test-be test-fe test-e2e check-openapi up down logs \
	test-e2e-local-stack images k8s-up k8s-down test-e2e-k8s ncsa-up ncsa-down test-e2e-ncsa

help: ## List the available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-14s %s\n", $$1, $$2}'

setup: ## One-time setup: install the pre-commit hooks, the frontend's packages and Playwright's Chromium
	uvx pre-commit install
	cd frontend && npm ci && npx playwright install chromium

doctor: ## Check that tools, repo, and services are set up correctly
	@scripts/doctor.sh

model: ## Train the demo model into backend/ml_artifacts (the API needs it to start)
	cd backend && uv run python -m scripts.train_demo_model

gen-api: ## After changing the API: regenerate frontend/openapi.json and the typed client (commit both)
	cd backend && uv run python -m scripts.export_openapi
	cd frontend && npm run gen:api

# no-commit-to-branch guards commits, not code, so lint skips it (otherwise lint fails on develop and main).
lint: ## Run every linter and formatter on all files
	SKIP=no-commit-to-branch uvx pre-commit run --all-files

test: test-be test-fe check-openapi test-e2e ## Run the full regression suite

test-fast: ## Run only the fast unit tests (for quick loops)
	cd backend && uv run pytest -m "not integration"

test-be: ## Backend tests (pytest; integration tests need `docker compose up -d redis`)
	cd backend && uv run pytest

test-fe: ## Frontend type-check and component tests (Vitest)
	cd frontend && npm run typecheck && npm test

# The generator is the pinned copy in frontend/node_modules (`npm exec --no` never downloads one); its errors stay visible.
check-openapi: ## Fail if frontend/openapi.json or the typed client no longer match the API
	@tmp=$$(mktemp -d) && trap 'rm -rf "$$tmp"' EXIT && \
	(cd backend && uv run python -m scripts.export_openapi "$$tmp/openapi.json" >/dev/null) && \
	(cd frontend && npm exec --no -- openapi-typescript "$$tmp/openapi.json" -o "$$tmp/schema.d.ts" >/dev/null) && \
	if diff -q frontend/openapi.json "$$tmp/openapi.json" >/dev/null && \
	   diff -q frontend/src/api/schema.d.ts "$$tmp/schema.d.ts" >/dev/null; then \
		echo "check-openapi: frontend/openapi.json and src/api/schema.d.ts match the API"; \
	else \
		echo "check-openapi: the API changed but the frontend's copy didn't. Run \`make gen-api\` and commit both files."; \
		exit 1; \
	fi

test-e2e: model ## End-to-end browser tests (Playwright; starts its own API and Vite on 8001/3001, needs Redis)
	cd frontend && npm run test:e2e

up: ## Build and start the full stack (redis, api, web) at http://localhost:8080; waits until healthy
	docker compose up -d --build --wait

down: ## Stop the stack (every Redis key is gone)
	docker compose down

logs: ## Follow the stack's logs
	docker compose logs -f

# One worker: the Redis restart test would otherwise wipe results under tests running beside it.
test-e2e-local-stack: ## The E2E suite against the running stack (`make up` first), including the Redis restart test
	cd frontend && BASE_URL=http://localhost:8080 E2E_RESTART_REDIS="docker compose restart redis" \
		npm run test:e2e -- --workers=1

# CI builds and pushes the same images to GHCR (.github/workflows/images.yml); this only checks that both build.
images: ## Build the api and web images for linux/amd64 and linux/arm64 (amd64 is emulated on the Mac; no push)
	docker buildx build --platform linux/amd64,linux/arm64 --output type=cacheonly backend
	docker buildx build --platform linux/amd64,linux/arm64 --output type=cacheonly frontend

# OrbStack's Kubernetes (deploy/k8s/overlays/local). Every command names the orbstack context, so no other cluster
# is ever touched.
K8S := kubectl --context orbstack -n mosaic

# The pods use the images Compose builds (mosaic-*:dev); the restart picks up a rebuild under the same tag.
k8s-up: ## Build the images and deploy to OrbStack's Kubernetes at http://localhost:8081; waits until ready
	docker compose build api web
	kubectl --context orbstack apply -k deploy/k8s/overlays/local
	$(K8S) rollout restart deployment/api deployment/web
	for d in redis api web; do $(K8S) rollout status deployment/$$d --timeout=180s || exit 1; done

k8s-down: ## Remove the app from OrbStack's Kubernetes (every Redis key is gone)
	kubectl --context orbstack delete namespace mosaic --ignore-not-found --wait

# The E2E suite against a cluster: $(1) is its kubectl, $(2) its URL. One worker: deleting the Redis pod would otherwise
# wipe results under tests running beside it. The restart waits for readyz too: the redis Service reaches the new pod
# a few seconds after the pod is Ready.
e2e_on_cluster = cd frontend && BASE_URL=$(2) E2E_KUBECTL='$(1)' \
	E2E_RESTART_REDIS='$(1) delete pod -l app=redis --wait && $(1) rollout status deployment/redis --timeout=60s && \
	for i in $$(seq 1 30); do curl -fs $(2)/api/v1/readyz >/dev/null && exit 0; sleep 1; done; exit 1' \
	npm run test:e2e -- --workers=1

test-e2e-k8s: ## The E2E suite against OrbStack's Kubernetes (`make k8s-up` first), including the Redis pod and replica tests
	$(call e2e_on_cluster,$(K8S),http://localhost:8081)

# The NCSA cluster (deploy/k8s/overlays/ncsa, docs/deploy-ncsa.md): the kubeconfig from Rancher, its visual-analytics
# context and the mosaic-staging namespace, named in every command. TAG picks the images CI pushed to GHCR; the default
# is origin/develop's commit (`git fetch` first for the latest).
NCSA_KUBECONFIG ?= $(HOME)/.kube/ncsa-visual-analytics.yaml
NCSA := kubectl --kubeconfig $(NCSA_KUBECONFIG) --context visual-analytics -n mosaic-staging
NCSA_URL := https://mosaic.staging.platform.visari.org
TAG ?= sha-$(shell git rev-parse --short=7 origin/develop)
NCSA_MANIFESTS = kubectl kustomize deploy/k8s/overlays/ncsa | sed 's/:IMAGE_TAG$$/:$(TAG)/'

ncsa-up: ## Deploy the GHCR images (TAG=sha-xxxxxxx, default origin/develop) to NCSA staging; waits until it answers
	$(NCSA_MANIFESTS) | $(NCSA) apply -f -
	for d in redis api web; do $(NCSA) rollout status deployment/$$d --timeout=300s || exit 1; done
	@echo "Waiting for $(NCSA_URL) (the first time, Traefik also gets its certificate)"
	@for i in $$(seq 1 60); do curl -fs $(NCSA_URL)/api/v1/readyz >/dev/null && echo ready && exit 0; sleep 5; done; exit 1

ncsa-down: ## Remove the app from NCSA staging (the namespace and its ghcr-pull secret stay)
	$(NCSA_MANIFESTS) | $(NCSA) delete --ignore-not-found -f -

test-e2e-ncsa: ## The E2E suite against NCSA staging (`make ncsa-up` first), including the Redis pod and replica tests
	$(call e2e_on_cluster,$(NCSA),$(NCSA_URL))
