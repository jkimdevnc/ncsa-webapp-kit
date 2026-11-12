# Everyday commands. `make help` lists them.
#
# Two kinds of checks:
#   make doctor  - setup checks (tools, repo, services). Not feature tests.
#   make test    - the feature regression suite. Every feature step adds to it.

.DEFAULT_GOAL := help
.PHONY: help setup doctor model gen-api lint test test-fast test-be test-fe test-e2e check-openapi up down logs \
	test-e2e-local-stack images

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
	cd frontend && BASE_URL=http://localhost:8080 E2E_RESTART_REDIS=1 npm run test:e2e -- --workers=1

# CI builds and pushes the same images to GHCR (.github/workflows/images.yml); this only checks that both build.
images: ## Build the api and web images for linux/amd64 and linux/arm64 (amd64 is emulated on the Mac; no push)
	docker buildx build --platform linux/amd64,linux/arm64 --output type=cacheonly backend
	docker buildx build --platform linux/amd64,linux/arm64 --output type=cacheonly frontend
