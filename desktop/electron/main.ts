import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions, shell } from "electron";
import path from "node:path";
import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { getGpuSwitches, resolveGpuModeFromArgs } from "./gpuMode";
import {
  APP_NAME_FALLBACK,
  REPO_URL,
  RELEASES_URL,
  buildAboutDetail,
  describeReleaseCheckStatus,
} from "./aboutConfig";

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

function getAppIconPath(): string | undefined {
  // In dev, the source icon is at the repo root build/. In packaged builds,
  // electron-builder will copy build/icon.png into the application resources
  // under extraResources when configured.
  const candidates = [
    path.join(__dirname, "..", "..", "build", "icon.png"),
    path.join(__dirname, "..", "..", "build", "icon.ico"),
    path.join(process.resourcesPath ?? "", "build", "icon.png"),
    path.join(process.resourcesPath ?? "", "build", "icon.ico"),
  ];
  for (const candidate of candidates) {
    if (candidate && require("node:fs").existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function getAppVersion(): string {
  try {
    return app.getVersion();
  } catch {
    return "0.0.0";
  }
}

function getAppName(): string {
  try {
    return app.getName();
  } catch {
    return APP_NAME_FALLBACK;
  }
}

async function showAboutDialog(parent: BrowserWindow | undefined): Promise<void> {
  const version = getAppVersion();
  const detail = buildAboutDetail(version, getAppName(), REPO_URL);
  const options: Electron.MessageBoxOptions = {
    type: "info",
    title: "このアプリについて",
    message: `${getAppName()} について`,
    detail,
    buttons: ["OK", "更新を確認", "GitHub を開く"],
    defaultId: 0,
    cancelId: 0,
  };
  try {
    const result = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options);
    if (result.response === 1) {
      void checkForUpdates(parent);
    } else if (result.response === 2) {
      void shell.openExternal(REPO_URL);
    }
  } catch {
    // dialog might be unavailable in test contexts
  }
}

async function checkForUpdates(parent: BrowserWindow | undefined): Promise<void> {
  // 現時点では自動更新は無効。GitHub の Releases ページへ誘導する。
  // 自動更新を有効化する場合、electron-updater の導入と配布 URL / 署名検証の設定が必要。
  let message = "最新リリース情報を確認します。GitHub の Releases ページを開きますか?";
  try {
    const response = await fetch(RELEASES_URL, { method: "HEAD", redirect: "follow" });
    message = describeReleaseCheckStatus(response.ok, response.status, null, RELEASES_URL);
  } catch (error) {
    message = describeReleaseCheckStatus(false, 0, error instanceof Error ? error.message : String(error), RELEASES_URL);
  }
  const options: Electron.MessageBoxOptions = {
    type: "info",
    title: "更新の確認",
    message: "更新の確認",
    detail: message,
    buttons: ["GitHub を開く", "OK"],
    defaultId: 0,
    cancelId: 1,
  };
  try {
    const result = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options);
    if (result.response === 0) {
      void shell.openExternal(RELEASES_URL);
    }
  } catch {
    // dialog might be unavailable in test contexts
  }
}

function buildAppMenu(): void {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: getAppName(),
            submenu: [
              { role: "about" as const, label: `${getAppName()} について` },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "ファイル",
      submenu: [
        isMac ? { role: "close" as const } : { role: "quit" as const, label: "終了" },
      ],
    },
    {
      label: "ヘルプ",
      submenu: [
        {
          label: "更新を確認",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow() ?? mainWindow;
            void checkForUpdates(focused);
          },
        },
        {
          label: `${getAppName()} について`,
          click: () => {
            const focused = BrowserWindow.getFocusedWindow() ?? mainWindow;
            void showAboutDialog(focused);
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  const stage = status;
  const stages = [
    { key: "starting", label: "起動準備" },
    { key: "backend", label: "バックエンド" },
    { key: "ui", label: "UI" },
  ];
  const stageHtml = stages
    .map((s) => {
      const reached = (stage === s.key) || (stage === "ui" && s.key !== "ui") || (stage === "error");
      const cls = s.key === stage ? "active" : reached ? "done" : "pending";
      return `<div class="stage ${cls}">${s.label}</div>`;
    })
    .join('<div class="stage-sep">›</div>');
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
      background: linear-gradient(135deg, #f4f6f9 0%, #e6edf5 100%);
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 14px;
      border-top: 4px solid #3a6fa5;
    }
    .mark {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #1f3b5a;
    }
    .title { font-size: 14px; color: #526273; margin-top: -6px; }
    .status { font-size: 17px; font-weight: 600; }
    .message { color: #526273; font-size: 12px; max-width: 360px; text-align: center; line-height: 1.5; }
    .version { color: #6b7785; font-size: 11px; margin-top: 8px; }
    .spinner {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid #cad4df;
      border-top-color: #3a6fa5;
      animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stages {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 11px;
    }
    .stage {
      padding: 3px 8px;
      border-radius: 999px;
      background: #dde4ec;
      color: #6b7785;
    }
    .stage.active { background: #3a6fa5; color: #fff; font-weight: 600; }
    .stage.done { background: #b8d4b8; color: #2e5d2e; }
    .stage-sep { color: #8fa1b3; }
  </style>
</head>
<body>
  <div class="mark">SC</div>
  <div class="title">Spacer Clone</div>
  <div class="status">${heading}</div>
  <div class="spinner"></div>
  <div class="stages">${stageHtml}</div>
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
  const iconPath = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: `Spacer Clone v${version}`,
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
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
  buildAppMenu();
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
