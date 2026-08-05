# Windows Electron Input Audit Environment

- Audit date: 2026-08-05
- Repository: `C:\Users\織田雅春\Desktop\三次元立体骨組み解析ソフトプロジェクト\spacer-clone-main`
- Branch at start: `main`
- Base SHA: `83264c04164869fda3cdd5d7d103493fb0e2a951`
- Windows: `Windows 10 Enterprise`, version `2009`, build `26200`
- Node.js: `v22.16.0`
- npm: `10.9.2`
- Electron package: `42.3.3`
- Browser comparison target: Vite dev page at `http://127.0.0.1:5173/pro/apollo`
- Electron comparison target: dev main window loading `http://127.0.0.1:5173/` then Apollo route via UI
- IME: Japanese input profile detected; real IME interaction not verified in this audit

Commands used:

- Browser dev: `cd frontend && npm run dev:apollo -- --host 127.0.0.1 --strictPort`
- Backend: `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`
- Electron main compile: `cd frontend && npm run electron:compile`
- Electron dev launch for audit: Playwright Electron launch of `../desktop/electron/dist/main.js`

Scoped files confirmed relevant:

- `frontend/src/apollo/components/GuidedDetailDrawer.tsx`
- `frontend/src/apollo/ApolloPhase1Shell.tsx`
- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx`
- `frontend/src/apollo/components/CompositionAwareInput.tsx`
- `desktop/electron/main.ts`
- `desktop/electron/preload.ts`

Quality checks executed during audit:

- `cd frontend && npm run typecheck`
- `cd frontend && npx vitest run src/apollo/components/__tests__/GuidedDetailDrawer.test.tsx`
