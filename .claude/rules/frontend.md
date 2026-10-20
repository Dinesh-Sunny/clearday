---
paths:
  - "src/app/**"   # TODO(stub): set to the real frontend dir
  - "**/components/**"
  - "**/*.{tsx,jsx,vue,svelte}"
  - "**/*.{css,scss}"
---
<!-- last-verified: 2026-10-01 -->
# Frontend

- Framework conventions: {{e.g. Next.js App Router: Server Components by default, "use client" only when needed}}
- UI primitives come from {{UI_LIBRARY}}. Don't hand-roll what it already provides.
- Styling: {{e.g. Tailwind utility classes + design tokens; no inline styles except dynamic values}}
- State: {{local first → URL state → global store ({{STATE_LIB}})}}
- Data fetching: {{e.g. server-side in RSC / loaders; client via {{QUERY_LIB}}}}
- Accessibility: semantic HTML, labelled controls, keyboard reachable, visible focus, alt text.
- Responsive from 360px up. Test in light and dark themes.
- Images/fonts via the framework's optimized components.
