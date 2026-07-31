import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { _electron as electron } from "playwright";

const verificationDate = "Friday, July 31, 2026";
const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, "..");
const artifactDir = path.join(
  repoRoot,
  "docs",
  "apollo",
  "phase1-orchestration",
  "electron-verification",
);
const logPath = path.join(artifactDir, "startup_log.txt");
const summaryPath = path.join(artifactDir, "electron_verification_summary.json");
const processManifestPath = path.join(artifactDir, "process_manifest.csv");
const launchEnvironmentPath = path.join(artifactDir, "launch_environment.json");
const electronMainPath = path.join(repoRoot, "desktop", "electron", "dist", "main.js");
const backendPython = path.join(repoRoot, ".venv", "bin", "python");

const processManifest = [];
const consoleMessages = [];

async function appendLog(line) {
  await fs.appendFile(logPath, `${line}\n`, "utf8");
}

async function ensureArtifactsDir() {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(logPath, "", "utf8");
}

function trackProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? frontendDir,
    env: options.env ?? process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk.toString()));
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
  processManifest.push({
    label,
    pid: child.pid ?? -1,
    command: [command, ...args].join(" "),
    cwd: options.cwd ?? frontendDir,
    startTime: new Date().toISOString(),
    endTime: "",
    exitCode: "",
  });
  return { label, child, stdout, stderr };
}

async function stopTrackedProcess(record) {
  if (!record) return;
  const { child, label, stdout, stderr } = record;
  if (child.exitCode === null) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    await delay(1000);
  }
  if (child.exitCode === null) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
  const manifestEntry = processManifest.find((entry) => entry.label === label && entry.pid === (child.pid ?? -1));
  if (manifestEntry) {
    manifestEntry.endTime = new Date().toISOString();
    manifestEntry.exitCode = String(child.exitCode ?? "");
  }
  if (stdout.length > 0) {
    await appendLog(`[${label}:stdout]\n${stdout.join("")}`);
  }
  if (stderr.length > 0) {
    await appendLog(`[${label}:stderr]\n${stderr.join("")}`);
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function compileElectron() {
  const compile = trackProcess("electron-compile", "npm", ["run", "electron:compile"]);
  const exitCode = await new Promise((resolve) => compile.child.on("exit", resolve));
  await stopTrackedProcess(compile);
  if (exitCode !== 0) {
    throw new Error(`electron:compile failed with exit code ${exitCode}`);
  }
}

async function startBackend() {
  const backend = trackProcess(
    "backend",
    backendPython,
    ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: repoRoot },
  );
  await waitForHttp("http://127.0.0.1:8000/health", 30000);
  return backend;
}

async function startVite() {
  const vite = trackProcess(
    "vite-apollo",
    "npm",
    ["run", "dev:apollo", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { cwd: frontendDir },
  );
  await waitForHttp("http://127.0.0.1:5173", 60000);
  return vite;
}

async function waitForMainWindow(electronApp) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const windowPage of electronApp.windows()) {
      const url = windowPage.url();
      if (url.startsWith("http://127.0.0.1:5173") || url.startsWith("http://localhost:5173")) {
        await windowPage.waitForLoadState("domcontentloaded");
        return windowPage;
      }
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the Electron main window.");
}

async function openProfessionalWorkspace(page) {
  await page.waitForLoadState("domcontentloaded");
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath === "/pro" || currentPath.startsWith("/pro/")) {
    return;
  }
  const professionalButton = page.getByRole("button", { name: /実務編で詳しく見る|実務編/ });
  await professionalButton.waitFor({ state: "visible", timeout: 30000 });
  await professionalButton.click();
  await page.waitForFunction(() => window.location.pathname === "/pro");
}

async function openApolloSampleTopology(page) {
  const apolloEntry = page.getByTestId("open-apollo-phase1");
  await apolloEntry.waitFor({ state: "visible", timeout: 30000 });
  await apolloEntry.click();
  await page.waitForFunction(() => window.location.pathname === "/pro/apollo");
  await page.getByTestId("apollo-phase1-shell").waitFor({ state: "visible", timeout: 30000 });
  await page.getByTestId("apollo-open-sample-selection").click();
  await page.getByTestId("apollo-load-standard-sample").click();
  await page.getByRole("button", { name: "一覧編集モード", exact: true }).click();
  await page.getByTestId("apollo-topology-shell").waitFor({ state: "visible", timeout: 30000 });
}

async function ensureViewPanelOpen(page) {
  const openButton = page.getByTestId("open-view-panel");
  if (await openButton.count()) {
    await openButton.click();
  }
  await page.getByTestId("viewer-diagnostics-toggle").waitFor({ state: "visible", timeout: 10000 });
}

async function openDiagnosticsPanel(page, compatVisible) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const diagnostics = await readDiagnostics(page);
    if (diagnostics) {
      return diagnostics;
    }
    const diagnosticsToggle = page.getByTestId("viewer-diagnostics-toggle");
    if (await diagnosticsToggle.count()) {
      await diagnosticsToggle.click().catch(() => undefined);
    }
    if (compatVisible) {
      const compatButton = page.getByTestId("viewer-open-diagnostics");
      if (await compatButton.count()) {
        await compatButton.click().catch(() => undefined);
      }
    }
    await delay(250);
  }
  return null;
}

async function readDiagnostics(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("[data-testid='viewer-diagnostics-panel']");
    if (!panel) return null;
    const rows = {};
    const dts = panel.querySelectorAll("dt");
    const dds = panel.querySelectorAll("dd");
    for (let index = 0; index < Math.min(dts.length, dds.length); index += 1) {
      rows[dts[index].textContent ?? `row-${index}`] = dds[index].textContent ?? "";
    }
    return rows;
  });
}

async function waitForViewerReadiness(page) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const compatVisible = await page.getByTestId("viewer-compat-banner").isVisible().catch(() => false);
    const canvasVisible = await page.locator(".three-viewport canvas").isVisible().catch(() => false);
    const viewerStats = await page.locator(".viewer-stats").textContent().catch(() => "");
    if (compatVisible || (canvasVisible && viewerStats.includes("Apollo Solid:"))) {
      return { compatVisible, canvasVisible, viewerStats };
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the Apollo viewer to reach a stable state.");
}

async function captureWindowUrls(electronApp) {
  const windows = [];
  for (const windowPage of electronApp.windows()) {
    windows.push({
      url: windowPage.url(),
      title: await windowPage.title().catch(() => ""),
    });
  }
  return windows;
}

async function closeElectronApp(electronApp, page) {
  try {
    const returnButton = page.getByTestId("apollo-return-to-pro");
    if (await returnButton.isVisible().catch(() => false)) {
      await returnButton.click().catch(() => undefined);
      await page.waitForFunction(() => window.location.pathname === "/pro", { timeout: 5000 }).catch(() => undefined);
    }
  } catch {
    // best effort only
  }

  const closePromise = electronApp.close();
  await Promise.race([closePromise, delay(5000)]);
  if (electronApp.process()?.exitCode == null) {
    electronApp.process()?.kill("SIGKILL");
  }
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function main() {
  await ensureArtifactsDir();
  await appendLog(`Verification started on ${new Date().toISOString()} (${verificationDate})`);
  await compileElectron();
  const backend = await startBackend();
  const vite = await startVite();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apollo-electron-"));
  const summary = {
    verificationDate,
    repoRoot,
    frontendDir,
    checks: {},
    diagnostics: null,
    screenshots: {},
    logs: [],
    windowUrls: [],
  };

  let electronApp;
  let page;
  try {
    electronApp = await electron.launch({
      args: ["--disable-http-cache", `--user-data-dir=${userDataDir}`, electronMainPath],
      cwd: frontendDir,
      env: {
        ...process.env,
        SPACER_AUTOMATION: "1",
      },
    });
    page = await waitForMainWindow(electronApp);
    page.on("console", (message) => {
      const line = `[renderer-console] ${message.type()}: ${message.text()}`;
      consoleMessages.push(line);
      summary.logs.push(line);
    });
    page.on("pageerror", (error) => {
      const line = `[renderer-pageerror] ${error.message}`;
      consoleMessages.push(line);
      summary.logs.push(line);
    });

    summary.checks.mainWindowAttached = true;
    summary.windowUrls = await captureWindowUrls(electronApp);
    summary.checks.initialWindowCount = summary.windowUrls.length;
    summary.checks.appVersion = await electronApp.evaluate(({ app }) => app.getVersion());

    await openProfessionalWorkspace(page);
    summary.checks.professionalWorkspace = await page.evaluate(() => window.location.pathname);

    await openApolloSampleTopology(page);
    const viewerState = await waitForViewerReadiness(page);
    summary.checks.routeLoaded = await page.evaluate(() => window.location.pathname);
    summary.checks.viewerState = viewerState;

    await ensureViewPanelOpen(page);
    summary.diagnostics = await openDiagnosticsPanel(page, viewerState.compatVisible);
    if (!summary.diagnostics) {
      throw new Error("Viewer diagnostics panel did not render.");
    }

    summary.checks.viewerMode = summary.diagnostics["Viewer mode"] ?? "Unavailable";
    summary.checks.fallbackReason = summary.diagnostics["Fallback reason"] ?? "Unavailable";
    summary.checks.solidCount = parsePositiveInt(summary.diagnostics["Solid count"]);
    summary.checks.lineCount = parsePositiveInt(summary.diagnostics["Line element count"]);
    summary.checks.webglAvailable = summary.diagnostics["WebGL available"] ?? "false";
    summary.checks.compatBannerVisible = viewerState.compatVisible;
    summary.checks.consoleErrorCount = consoleMessages.filter((line) => line.includes("error:")).length;
    summary.checks.selectionSmoke = false;

    if (summary.checks.solidCount <= 0 || summary.checks.lineCount <= 0) {
      throw new Error(`Unexpected Apollo counts: line=${summary.checks.lineCount} solid=${summary.checks.solidCount}`);
    }

    await page.getByTestId("view-fit").click();
    await page.getByTestId("view-iso").click();
    const canvas = page.locator(".three-viewport canvas");
    if (await canvas.count()) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 8 });
        await page.mouse.up();
        summary.checks.selectionSmoke = true;
      }
    }

    summary.screenshots.viewer = path.join(artifactDir, "apollo_viewer_smoke.png");
    await page.screenshot({ path: summary.screenshots.viewer, fullPage: true });
  } catch (error) {
    summary.checks.failure = error instanceof Error ? error.message : String(error);
    if (page) {
      const failureShot = path.join(artifactDir, "apollo_viewer_smoke_failure.png");
      summary.screenshots.failure = failureShot;
      await page.screenshot({ path: failureShot, fullPage: true }).catch(() => undefined);
      summary.windowUrls = electronApp ? await captureWindowUrls(electronApp).catch(() => summary.windowUrls) : summary.windowUrls;
    }
    throw error;
  } finally {
    if (electronApp && page) {
      await closeElectronApp(electronApp, page).catch(() => undefined);
    }
    await stopTrackedProcess(vite);
    await stopTrackedProcess(backend);
    await fs.rm(userDataDir, { recursive: true, force: true });
    await fs.writeFile(
      processManifestPath,
      [
        "label,pid,command,cwd,start_time,end_time,exit_code",
        ...processManifest.map((entry) =>
          [
            entry.label,
            entry.pid,
            JSON.stringify(entry.command),
            JSON.stringify(entry.cwd),
            entry.startTime,
            entry.endTime,
            entry.exitCode,
          ].join(","),
        ),
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      launchEnvironmentPath,
      JSON.stringify(
        {
          verificationDate,
          frontendDir,
          repoRoot,
          electronMainPath,
          backendCommand: `${backendPython} -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`,
          vitePort: 5173,
          backendPort: 8000,
        },
        null,
        2,
      ),
      "utf8",
    );
    summary.logs.push(...consoleMessages);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  }
}

await main();
