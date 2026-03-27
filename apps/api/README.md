# API Workspace

This package is the backend slot for the monorepo.

Planned responsibilities:
- GitHub OAuth callback/session support beyond desktop shell identity
- workspace membership and authority management
- document, comment, approval, and lock persistence
- publish batch orchestration and webhook delivery

Current foundation:
- Hono on the Node adapter
- typed RPC surface exported from `@harness-docs/contracts`
- simple health and workspace endpoints for client wiring
