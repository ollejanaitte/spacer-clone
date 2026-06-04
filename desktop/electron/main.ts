import { app, BrowserWindow } from "electron";
import path from "node:path";
import { getGpuSwitches, resolveGpuModeFromArgs } from "./gpuMode";

const gpuMode = resolveGpuModeFromArgs(process.argv, process.env.GPU_MODE);

for (const gpuSwitch of getGpuSwitches(gpuMode)) {
  app.commandLine.appendSwitch(gpuSwitch.name, gpuSwitch.value);
}

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getProductionIndexPath(): string {
  return path.resolve(__dirname, "../../../frontend/dist/index.html");
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
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

  if (app.isPackaged) {
    await window.loadFile(getProductionIndexPath());
  } else {
    await window.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
