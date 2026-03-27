# Repository Rules

This repository is set up for a small team. Use GitHub `Settings > Rules > Rulesets` and apply the following to `main`.

## Recommended Ruleset

- Name: `protect-main`
- Target: `Branch`
- Branch pattern: `main`
- Restrict deletions: `on`
- Restrict force pushes: `on`
- Require a pull request before merging: `on`
- Required approvals: `1`
- Dismiss stale pull request approvals when new commits are pushed: `on`
- Require review from code owners: `off` until a real `CODEOWNERS` file is ready
- Require status checks to pass before merging: `on`
- Require branches to be up to date before merging: `on`
- Require conversation resolution before merging: `on`
- Block direct pushes: `on`
- Allow bypassing the above settings: `off`

## Merge Strategy

- Enable `Squash merge`
- Disable `Merge commit`
- Disable `Rebase merge`
- Enable `Automatically delete head branches`

## Required Status Checks

Match these names exactly:

- `desktop-build`
- `api-build`
- `db-check`
- `format`

## Team Operating Rules

- All changes go through a pull request
- Do not merge with red CI
- Do not use force push on shared branches
- Keep API, desktop, and DB changes separated unless they are the same feature
- Prefer one focused PR over a large mixed PR

## Optional Later Upgrades

Add these only when the team feels the need:

- `CODEOWNERS`
- Merge queue
- Signed commits
- Two required approvals
