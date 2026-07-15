# Windows exe Packaging Notes

In this revision, the packaged Electron build does the following:

- Automatically launches `resources/backend/spacer-backend.exe`.
- Loads `resources/frontend/index.html`.
- Sets `base: "./"` in Vite so the assets are also loadable over `file://`.
- Removes `type: "module"` from `frontend/package.json` so the Electron main runs as CommonJS.
- Empties the preload script to avoid the unnecessary `./gpuMode` import error.

## Build Steps

```powershell
cd "<repository>\frontend"
npm run pack:win
```

Launch file:

```text
release\win-unpacked\Spacer Clone.exe
```

When distributing, zip the entire `release\win-unpacked` folder together instead of the `Spacer Clone.exe` file alone.
