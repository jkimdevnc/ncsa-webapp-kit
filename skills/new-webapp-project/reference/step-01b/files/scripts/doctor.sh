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

default_branch_is_develop() {
	[ "$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)" = "develop" ]
}

merge_commits_only() {
	[ "$(gh api "repos/{owner}/{repo}" --jq '[.allow_merge_commit, .allow_squash_merge, .allow_rebase_merge] | map(tostring) | join(" ")')" = "true false false" ]
}

branches_kept_after_merge() {
	[ "$(gh api "repos/{owner}/{repo}" --jq .delete_branch_on_merge)" = "false" ]
}

gh_account_is_jkimdevnc() {
	gh auth status 2>&1 | grep -B1 'Active account: true' | grep -q 'account jkimdevnc '
}

echo "Tools"
check "uv installed" uv --version
check "docker CLI installed" docker --version
check "docker compose installed" docker compose version
check "docker daemon running (open OrbStack)" docker info
check "node 26 or newer" node_is_26_or_newer
check "gh logged in" gh auth status
check "gh active account is jkimdevnc (gh auth switch -u jkimdevnc)" gh_account_is_jkimdevnc

echo "Repo"
check "inside a git repo" git rev-parse --is-inside-work-tree
check "origin remote set" git remote get-url origin
check "active gh account can see the repo (gh auth switch)" gh repo view
check "GitHub repo is private and a template" repo_is_private_template
check "pre-commit hook installed (make setup)" test -f .git/hooks/pre-commit

echo "Branching"
check "develop is the default branch" default_branch_is_develop
check "develop exists on origin" git ls-remote --exit-code --heads origin develop
check "main exists on origin" git ls-remote --exit-code --heads origin main
check "merge commits only (no squash/rebase)" merge_commits_only
check "merged branches are kept (no auto-delete)" branches_kept_after_merge

echo
if [ "$failures" -eq 0 ]; then
	echo "All checks passed."
else
	echo "$failures check(s) failed."
	exit 1
fi
