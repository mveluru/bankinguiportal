# Project docs

Reference for the Brite Banking UI Portal, split by layer. Start with `overview.md`. For the rules to follow when
changing a layer, see the matching skill in `../skills/`. Screens and env vars are in the repo-root `README.md`.

| Layer | Doc | Skill (rules) |
|---|---|---|
| Whole system, folders, conventions | [overview.md](overview.md) | [portal-conventions](../skills/portal-conventions/SKILL.md) |
| Pages (`app/**/page.tsx`) | [pages.md](pages.md) | [pages](../skills/pages/SKILL.md) |
| API routes (`app/api`) | [api-routes.md](api-routes.md) | [api-routes](../skills/api-routes/SKILL.md) |
| Components (`components/`), incl. the transaction form layout | [components.md](components.md) | [components](../skills/components/SKILL.md) |
| Library (`lib/`) | [lib.md](lib.md) | [lib](../skills/lib/SKILL.md) |
| Request gate and config | [overview.md](overview.md) | [request-gate](../skills/request-gate/SKILL.md) |
| Calling the banking backend (BFF, proxy, headers, errors) | [backend-integration.md](backend-integration.md) | [lib](../skills/lib/SKILL.md) |
| Key flows | [flows.md](flows.md) | (none) |
