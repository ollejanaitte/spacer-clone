# Operational Enablement — Apollo Phase 1 Flag

**Authority:** AP-00 / P01  
**Date:** 2026-07-27

## Production default

**OFF.** Do not set `VITE_APOLLO_PHASE1_ENABLED` in production build env unless supervisor signs AP-00 closure and explicit enablement is recorded in the decision log.

Unset variable → OFF (Vite does not inject the key).

## Local development

### Vite dev server

```bash
cd frontend
VITE_APOLLO_PHASE1_ENABLED=true npm run dev
```

### Electron dev

```bash
cd frontend
VITE_APOLLO_PHASE1_ENABLED=true npm run electron:dev
```

### One-shot verify (shell only)

1. Start with flag ON as above.
2. Open `/pro` → toolbar shows **Apollo** button (`data-testid="open-apollo-phase1"`).
3. Navigate to `/pro/apollo` → guarded shell (`data-testid="apollo-phase1-shell"`).
4. Restart without flag → button absent; `/pro/apollo` redirects to `/pro`.

## CI / Vitest

Tests stub the flag per case:

```typescript
vi.stubEnv("VITE_APOLLO_PHASE1_ENABLED", "true");
```

Default test env leaves flag OFF.

## Rollback

Remove or unset `VITE_APOLLO_PHASE1_ENABLED`. No database or project-file migration required.

## Authorization

Per DEC-AP00-0003 and forbidden scope: feature flag default **on** without supervisor sign-off is forbidden. Operational enablement is for authorized development and test harnesses only.
