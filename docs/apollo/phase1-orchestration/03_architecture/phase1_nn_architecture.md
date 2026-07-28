# Phase 1-NN Architecture

**Date:** Tuesday, July 28, 2026

## Layers

- UI shell: `ApolloPhase1Shell`
- route / entry guard: `apollo/routes.ts`, `apollo/entryGuard.ts`
- feature flags: `apollo/featureFlag.ts`
- project data shell: `ProjectModel`-backed metadata and topology edits
- adapter shell: shell-only status list
- validation shell: shell-level consistency checks only
- audit shell: local route action log

## Numeric boundary

- no solver imports
- no authoritative result rendering
- no authoritative export invocation
- no verified badge
- no machine-evidence claims
