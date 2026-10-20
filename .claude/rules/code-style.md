<!-- last-verified: 2026-10-01 -->
<!--
  Rule with no `paths:` frontmatter: loads at session start, like CLAUDE.md.
  Docs: https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/
-->
# Code style

- Match the style of the file you are editing before applying any rule below.
- Naming: {{e.g. camelCase vars/functions, PascalCase types/components, SCREAMING_SNAKE constants, kebab-case files}}
- Exports: {{named exports only | default exports for pages/components}}
- Imports: {{absolute alias e.g. "@/..." | relative}}; order: std/lib → external → internal → relative.
- Functions: small, single-purpose; early returns over nested conditionals.
- Types: {{strict mode on; no `any`; prefer inferred types at call sites, explicit at module boundaries}}
- Errors: {{throw typed errors | return Result/{data,error} shape}}. Never swallow errors silently.
- Constants and config live in {{CONSTANTS_PATH}}. No magic numbers or strings inline.
- Comments explain *why*. Delete commented-out code.
- Formatting is owned by {{FORMATTER}}. Don't hand-format; the PostToolUse hook runs it.
<!-- TODO(stub): replace {{...}} once the stack is chosen. -->
