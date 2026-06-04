"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const gpuMode_1 = require("./gpuMode");
const gpuMode = (0, gpuMode_1.resolveGpuModeFromArgs)(process.argv, process.env.GPU_MODE);
for (const gpuSwitch of (0, gpuMode_1.getGpuSwitches)(gpuMode)) {
    electron_1.app.commandLine.appendSwitch(gpuSwitch.name, gpuSwitch.value);
}
function getPreloadPath() {
    return node_path_1.default.join(__dirname, "preload.js");
}
function getProductionIndexPath() {
    return node_path_1.default.resolve(__dirname, "../../../frontend/dist/index.html");
}
async function createMainWindow() {
    const window = new electron_1.BrowserWindow({
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
    if (electron_1.app.isPackaged) {
        await window.loadFile(getProductionIndexPath());
    }
    else {
        await window.loadURL("http://localhost:5173");
    }
}
electron_1.app.whenReady().then(async () => {
    await createMainWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            void createMainWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
