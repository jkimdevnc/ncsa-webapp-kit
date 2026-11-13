#!/bin/sh
# Setup checks for working on the kit. Prints one line per check and exits non-zero if any fail.
# Same style as mosaic-prototype's scripts/doctor.sh.
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

# Runs the check only for repo admins; collaborators can't change (or always see) repo settings.
owner_check() {
	if [ "$is_admin" = true ]; then
		check "$@"
	else
		printf '  - %s (skipped: needs admin rights on the repo)\n' "$1"
	fi
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

repo_is_private() {
	[ "$(gh repo view --json visibility --jq .visibility)" = "PRIVATE" ]
}

skill_symlink_points_here() {
	[ "$(cd "$HOME/.claude/skills/new-webapp-project" && pwd -P)" = "$(cd skills/new-webapp-project && pwd -P)" ]
}

echo "Tools"
check "git installed" git --version
check "uv installed" uv --version
check "gh installed and logged in" gh auth status

echo "Repo"
check "GitHub repo is visible to the active gh account" gh repo view
check "pre-commit hook installed (make setup)" test -f .git/hooks/pre-commit
check "skill loaded through ~/.claude/skills/new-webapp-project (symlink to this repo)" skill_symlink_points_here

echo "Branching"
check "develop is the default branch" default_branch_is_develop
check "develop exists on origin" git ls-remote --exit-code --heads origin develop
check "main exists on origin" git ls-remote --exit-code --heads origin main

is_admin=$(gh api "repos/{owner}/{repo}" --jq .permissions.admin 2>/dev/null || echo false)
echo "Repo settings"
owner_check "GitHub repo is private" repo_is_private
owner_check "merge commits only (no squash/rebase)" merge_commits_only
owner_check "merged branches are kept (no auto-delete)" branches_kept_after_merge

if [ "$failures" -gt 0 ]; then
	echo "$failures check(s) failed."
	exit 1
fi
echo "All checks passed."
