.DEFAULT_GOAL := help
SKILL := skills/new-webapp-project
# skill-creator's validator; override with `make lint SKILL_CREATOR=/path/to/skill-creator` if it lives elsewhere.
SKILL_CREATOR ?= $(firstword $(wildcard $(HOME)/.claude/skills/synced/*/skill-creator) $(wildcard $(HOME)/.claude/plugins/marketplaces/*/plugins/skill-creator/skills/skill-creator))

.PHONY: help setup lint doctor

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

setup: ## One-time setup: install the pre-commit hooks
	uvx pre-commit install

lint: ## Run the pre-commit hooks on all files and validate the skill
	SKIP=no-commit-to-branch uvx pre-commit run --all-files
	@if [ -n "$(SKILL_CREATOR)" ]; then \
		uv run --quiet --no-project --with pyyaml python -I $(SKILL_CREATOR)/scripts/quick_validate.py $(SKILL); \
	else echo "skill-creator not found: skipped the skill validation (set SKILL_CREATOR)"; fi

doctor: ## Check this machine and the repo settings
	@sh scripts/doctor.sh
