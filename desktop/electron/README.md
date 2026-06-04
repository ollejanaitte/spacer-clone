# Electron Desktop

Run commands from `frontend/`.

```bash
npm run electron:dev
GPU_MODE=compat-gpu-blocklist npm run electron:dev
GPU_MODE=compat-angle-gl npm run electron:dev
GPU_MODE=legacy-desktop-gl npm run electron:dev
```

`normal` is the default GPU mode. `legacy-desktop-gl` is intended only as a last-resort compatibility mode.
