import { app, BrowserWindow } from "electron";
import path from "node:path";
import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { getGpuSwitches, resolveGpuModeFromArgs } from "./gpuMode";

const gpuMode = resolveGpuModeFromArgs(process.argv, process.env.GPU_MODE);
let backendProcess: ChildProcessWithoutNullStreams | undefined;

for (const gpuSwitch of getGpuSwitches(gpuMode)) {
  app.commandLine.appendSwitch(gpuSwitch.name, gpuSwitch.value);
}

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getProductionIndexPath(): string {
  return path.join(process.resourcesPath, "frontend", "index.html");
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

  console.error("Backend did not become ready within 30 seconds.");
}

async function startBackend(): Promise<void> {
  if (!app.isPackaged) {
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

async function createMainWindow(): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "Spacer Clone",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath(),
    },
  });

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

  if (app.isPackaged) {
    await mainWindow.loadFile(getProductionIndexPath());
  } else {
    await mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(async () => {
  await startBackend();
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
