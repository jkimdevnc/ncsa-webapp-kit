# Everyday commands. `make help` lists them.
#
# Two kinds of checks:
#   make doctor  - setup checks (tools, repo, services). Not feature tests.
#   make test    - the feature regression suite. Every feature step adds to it.

.DEFAULT_GOAL := help
.PHONY: help setup doctor model lint test test-fast test-be test-fe test-e2e check-openapi

help: ## List the available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-14s %s\n", $$1, $$2}'

setup: ## One-time setup: install the pre-commit hooks and the frontend's packages
	uvx pre-commit install
	cd frontend && npm ci

doctor: ## Check that tools, repo, and services are set up correctly
	@scripts/doctor.sh

model: ## Train the demo model into backend/ml_artifacts (the API needs it to start)
	cd backend && uv run python -m scripts.train_demo_model

# no-commit-to-branch guards commits, not code, so lint skips it (otherwise lint fails on develop and main).
lint: ## Run every linter and formatter on all files
	SKIP=no-commit-to-branch uvx pre-commit run --all-files

test: test-be test-fe check-openapi test-e2e ## Run the full regression suite

test-fast: ## Run only the fast unit tests (for quick loops)
	cd backend && uv run pytest -m "not integration"

test-be: ## Backend tests (pytest; integration tests need `docker compose up -d redis`)
	cd backend && uv run pytest

test-fe: ## Frontend component tests (Vitest)
	cd frontend && npm test

check-openapi: ## Fail if the frontend's OpenAPI spec is out of date
	@echo "check-openapi: no check yet (added in Step 9)"

test-e2e: ## End-to-end browser tests (Playwright)
	@echo "test-e2e: no tests yet (added in Step 10)"
