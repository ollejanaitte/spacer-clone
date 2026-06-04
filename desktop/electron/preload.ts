import { contextBridge } from "electron";
import { resolveGpuModeFromArgs } from "./gpuMode";

contextBridge.exposeInMainWorld("spacerDesktop", {
  gpuMode: resolveGpuModeFromArgs(process.argv, process.env.GPU_MODE),
});
