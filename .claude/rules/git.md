<!-- last-verified: 2026-10-01 -->
# Git

- Branch names: `{{feat|fix|chore|docs|refactor}}/<short-slug>`. Never commit straight to `{{DEFAULT_BRANCH}}`.
- Commits: Conventional Commits, imperative subject ≤ 72 chars, body explains *why*.
- One logical change per commit. Don't mix refactors with behavior changes.
- Before committing: lint, type-check, and the relevant tests pass.
- Never: force-push shared branches, rewrite published history, commit `.env*` or build output.
- PRs: use `/review` first; the description covers what, why, how it was tested, and screenshots for UI.
