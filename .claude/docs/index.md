# Project docs

Reference for the Brite Banking UI Portal. **Start here:**
1. **[bankingui-requirements.md](bankingui-requirements.md)** — Functional, technical, deployment requirements; success criteria
2. **[overview.md](overview.md)** — Architecture, request flow, design principles, conventions

Then dive into specific layers or topics. For the rules to follow when changing a layer, see the matching skill in `../skills/`. Screens and env vars are in the repo-root `README.md`.

| Topic | Doc | Skill (rules) |
|---|---|---|
| **Requirements & Specifications** | | |
| Functional & technical requirements | [bankingui-requirements.md](bankingui-requirements.md) | (reference) |
| **Architecture & Implementation** | | |
| System overview, request flow, principles, conventions | [overview.md](overview.md) | [portal-conventions](../skills/portal-conventions/SKILL.md) |
| Pages (`app/**/page.tsx`) | [pages.md](pages.md) | [pages](../skills/pages/SKILL.md) |
| API routes (`app/api`) | [api-routes.md](api-routes.md) | [api-routes](../skills/api-routes/SKILL.md) |
| Components (`components/`) | [components.md](components.md) | [components](../skills/components/SKILL.md) |
| Library (`lib/`) | [lib.md](lib.md) | [lib](../skills/lib/SKILL.md) |
| Request gate and config | [overview.md](overview.md) | [request-gate](../skills/request-gate/SKILL.md) |
| Calling the banking backend (BFF, proxy, headers, errors) | [backend-integration.md](backend-integration.md) | [lib](../skills/lib/SKILL.md) |
| Key flows | [flows.md](flows.md) | (none) |
| **Operations & Deployment** | | |
| Production deployment: paths, security, monitoring, runbooks | [production_deploy.md](production_deploy.md) | [deployment](../skills/deployment/SKILL.md) |
| **Testing** | | |
| End-to-end tests: demo users, spec list, daily request limit | [testing.md](testing.md) | [e2e](../skills/e2e/SKILL.md) |
