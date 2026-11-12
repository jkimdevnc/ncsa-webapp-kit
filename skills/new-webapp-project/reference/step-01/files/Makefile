# Everyday commands. `make help` lists them.
#
# Two kinds of checks:
#   make doctor  - setup checks (tools, repo, services). Not feature tests.
#   make test    - the feature regression suite. Every feature step adds to it.

.DEFAULT_GOAL := help
.PHONY: help setup doctor lint test test-fast test-be test-fe test-e2e check-openapi

help: ## List the available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-14s %s\n", $$1, $$2}'

setup: ## One-time setup: install the pre-commit hooks
	uvx pre-commit install

doctor: ## Check that tools, repo, and services are set up correctly
	@scripts/doctor.sh

lint: ## Run every linter and formatter on all files
	uvx pre-commit run --all-files

test: test-be test-fe check-openapi test-e2e ## Run the full regression suite

test-fast: ## Run only the fast unit tests (for quick loops)
	@echo "test-fast: no tests yet (added in Step 3)"

test-be: ## Backend tests (pytest)
	@echo "test-be: no tests yet (added in Step 3)"

test-fe: ## Frontend component tests (Vitest)
	@echo "test-fe: no tests yet (added in Step 8)"

check-openapi: ## Fail if the frontend's OpenAPI spec is out of date
	@echo "check-openapi: no check yet (added in Step 9)"

test-e2e: ## End-to-end browser tests (Playwright)
	@echo "test-e2e: no tests yet (added in Step 10)"
