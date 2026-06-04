"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const gpuMode_1 = require("./gpuMode");
electron_1.contextBridge.exposeInMainWorld("spacerDesktop", {
    gpuMode: (0, gpuMode_1.resolveGpuModeFromArgs)(process.argv, process.env.GPU_MODE),
});
