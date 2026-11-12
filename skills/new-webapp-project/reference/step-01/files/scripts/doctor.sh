#!/bin/sh
# Setup checks: is this machine and repo ready to work on? Prints one line per check and exits non-zero if any fail.
# Each step that adds setup (Docker services, frontend tooling, ...) adds its checks here.
set -u

cd "$(dirname "$0")/.."

failures=0

check() {
	label=$1
	shift
	if "$@" >/dev/null 2>&1; then
		printf '  \342\234\223 %s\n' "$label"
	else
		printf '  \342\234\227 %s\n' "$label"
		failures=$((failures + 1))
	fi
}

node_is_26_or_newer() {
	major=$(node --version 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')
	[ -n "$major" ] && [ "$major" -ge 26 ]
}

repo_is_private_template() {
	[ "$(gh repo view --json visibility,isTemplate --jq '.visibility + " " + (.isTemplate | tostring)')" = "PRIVATE true" ]
}

echo "Tools"
check "uv installed" uv --version
check "docker CLI installed" docker --version
check "docker compose installed" docker compose version
check "docker daemon running (open OrbStack)" docker info
check "node 26 or newer" node_is_26_or_newer
check "gh logged in" gh auth status

echo "Repo"
check "inside a git repo" git rev-parse --is-inside-work-tree
check "origin remote set" git remote get-url origin
check "GitHub repo is private and a template" repo_is_private_template
check "pre-commit hook installed (make setup)" test -f .git/hooks/pre-commit

echo
if [ "$failures" -eq 0 ]; then
	echo "All checks passed."
else
	echo "$failures check(s) failed."
	exit 1
fi
