import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { getGpuSwitches, resolveGpuModeFromArgs } from "./gpuMode";

const gpuMode = resolveGpuModeFromArgs(process.argv, process.env.GPU_MODE);
let backendProcess: ChildProcessWithoutNullStreams | undefined;
let splashWindow: BrowserWindow | undefined;
let mainWindow: BrowserWindow | undefined;

for (const gpuSwitch of getGpuSwitches(gpuMode)) {
  app.commandLine.appendSwitch(gpuSwitch.name, gpuSwitch.value);
}

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getProductionIndexPath(): string {
  return path.join(process.resourcesPath, "frontend", "index.html");
}

function getAppVersion(): string {
  try {
    return app.getVersion();
  } catch {
    return "0.0.0";
  }
}

async function waitForBackend(): Promise<void> {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:8000/health", {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // PyInstaller onefile extraction can take several seconds on first launch.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Backend did not become ready within 30 seconds.");
}

async function startBackend(): Promise<void> {
  if (!app.isPackaged) {
    // In development, the user (or start-windows.ps1 / start-mac.sh) starts the
    // backend externally. Skip spawning, but still wait for it to be ready.
    await waitForBackend();
    return;
  }

  const backendExePath = path.join(
    process.resourcesPath,
    "backend",
    "spacer-backend.exe",
  );

  backendProcess = spawn(backendExePath, [], {
    windowsHide: true,
  });

  backendProcess.on("error", (error) => {
    console.error("Failed to start backend:", error);
  });

  await waitForBackend();
}

function stopBackend(): void {
  if (backendProcess === undefined || backendProcess.pid === undefined) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync(
      "taskkill",
      ["/pid", String(backendProcess.pid), "/t", "/f"],
      {
        windowsHide: true,
        stdio: "ignore",
      },
    );
  } else {
    backendProcess.kill();
  }

  backendProcess = undefined;
}

function renderSplashHtml(status: "starting" | "backend" | "ui" | "error", message: string, version: string): string {
  const heading =
    status === "error"
      ? "起動に失敗しました"
      : status === "ui"
        ? "UIを準備しています"
        : status === "backend"
          ? "バックエンドを起動しています"
          : "Spacer Clone を起動しています";
  const color = status === "error" ? "#b00020" : "#273746";
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Spacer Clone 起動中</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: ${color};
      background: #f4f6f9;
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
    }
    .mark {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .status { font-size: 16px; }
    .message { color: #526273; font-size: 12px; max-width: 360px; text-align: center; }
    .version { color: #6b7785; font-size: 11px; margin-top: 16px; }
    .spinner {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid #cad4df;
      border-top-color: #3a6fa5;
      animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="mark">SC</div>
  <div class="status">${heading}</div>
  <div class="spinner"></div>
  <div class="message">${message}</div>
  <div class="version">Version ${version}</div>
</body>
</html>`;
}

function createSplashWindow(version: string): BrowserWindow {
  const splash = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    transparent: false,
    show: true,
    alwaysOnTop: true,
    title: "Spacer Clone",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splash.removeMenu();
  splash.setMenuBarVisibility(false);
  splash.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(renderSplashHtml("starting", "起動中です。しばらくお待ちください。", version)),
  );
  return splash;
}

function updateSplash(status: "starting" | "backend" | "ui" | "error", message: string, version: string): void {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(renderSplashHtml(status, message, version)),
  );
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = undefined;
}

async function createMainWindow(version: string): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: `Spacer Clone v${version}`,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath(),
    },
  });

  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error("Failed to load:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      closeSplash();
    }
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(getProductionIndexPath());
  } else {
    await mainWindow.loadURL("http://localhost:5173");
  }
}

async function runWithSplash(): Promise<void> {
  const version = getAppVersion();
  splashWindow = createSplashWindow(version);

  try {
    updateSplash("backend", "バックエンドの起動を待っています。初回は数秒かかる場合があります。", version);
    await startBackend();
    updateSplash("ui", "UIを準備しています。", version);
    await createMainWindow(version);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    updateSplash("error", message, version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    try {
      await dialog.showMessageBox({
        type: "error",
        title: "Spacer Clone",
        message: "Spacer Clone を起動できませんでした。",
        detail: message,
      });
    } catch {
      // dialog might be unavailable in test contexts
    }
    app.quit();
  }
}

app.whenReady().then(() => {
  void runWithSplash();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void runWithSplash();
    }
  });
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("window-all-closed", () => {
  closeSplash();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
export {};
