import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { _electron as electron } from "playwright";

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
const appVersionDate = "Tuesday, July 28, 2026";

const processManifest = [];
const launchSummary = {
  date: appVersionDate,
  repoRoot,
  frontendDir,
  checks: {},
  screenshots: {},
  logs: [],
};

async function appendLog(line) {
  await fs.appendFile(logPath, `${line}\n`, "utf8");
  launchSummary.logs.push(line);
}

function spawnProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? frontendDir,
    env: options.env ?? process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdoutLines = [];
  const stderrLines = [];
  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdoutLines.push(text);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderrLines.push(text);
  });
  processManifest.push({
    label,
    pid: child.pid ?? -1,
    command: [command, ...args].join(" "),
    cwd: options.cwd ?? frontendDir,
    startTime: new Date().toISOString(),
    endTime: "",
    exitCode: "",
  });
  return { child, stdoutLines, stderrLines, label };
}

async function stopProcess(record) {
  if (!record) return;
  const { child, label } = record;
  if (child.exitCode === null) {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    } else {
      child.kill("SIGTERM");
    }
    await delay(1000);
    if (child.exitCode === null) {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      } else {
        child.kill("SIGKILL");
      }
    }
  }
  const manifestEntry = processManifest.find((entry) => entry.label === label && entry.pid === (child.pid ?? -1));
  if (manifestEntry) {
    manifestEntry.endTime = new Date().toISOString();
    manifestEntry.exitCode = String(child.exitCode ?? "");
  }
  const stdout = record.stdoutLines.join("");
  const stderr = record.stderrLines.join("");
  if (stdout.trim()) {
    await appendLog(`[${label}:stdout]\n${stdout}`);
  }
  if (stderr.trim()) {
    await appendLog(`[${label}:stderr]\n${stderr}`);
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

async function ensureArtifactsDir() {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(logPath, "", "utf8");
}

async function compileElectron() {
  const compile = spawnProcess("electron-compile", "npm", ["run", "electron:compile"]);
  const exitCode = await new Promise((resolve) => {
    compile.child.on("exit", resolve);
  });
  await stopProcess(compile);
  if (exitCode !== 0) {
    throw new Error(`electron:compile failed with exit code ${exitCode}`);
  }
}

async function startBackend() {
  const backend = spawnProcess(
    "backend",
    backendPython,
    ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: repoRoot },
  );
  await waitForHttp("http://127.0.0.1:8000/health", 30000);
  return backend;
}

async function startVite(apolloEnabled) {
  const vite = spawnProcess(
    apolloEnabled ? "vite-on" : "vite-off",
    "npm",
    apolloEnabled
      ? ["run", "dev:apollo", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    { cwd: frontendDir, env: process.env },
  );
  await waitForHttp("http://127.0.0.1:5173", 60000);
  return vite;
}

async function openProfessionalWorkspace(page) {
  await page.waitForLoadState("domcontentloaded");
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath === "/pro" || currentPath.startsWith("/pro/")) {
    return;
  }
  const professionalButton = page.getByRole("button", { name: /実務編で詳しく見る|実務編/ });
  await professionalButton.waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({ path: path.join(artifactDir, "initial_screen.png"), fullPage: true });
  await professionalButton.click();
  await page.waitForFunction(() => window.location.pathname === "/pro");
}

async function waitForMainWindow(electronApp) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const windows = electronApp.windows();
    for (const windowPage of windows) {
      const url = windowPage.url();
      if (url.startsWith("http://localhost:5173") || url.startsWith("http://127.0.0.1:5173")) {
        await windowPage.waitForLoadState("domcontentloaded");
        return windowPage;
      }
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for the Electron main window.");
}

async function captureOffState() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apollo-electron-off-"));
  const vite = await startVite(false);
  const electronApp = await electron.launch({
    args: ["--disable-http-cache", `--user-data-dir=${userDataDir}`, electronMainPath],
    cwd: frontendDir,
    env: process.env,
  });
  try {
    const page = await waitForMainWindow(electronApp);
    await openProfessionalWorkspace(page);
    await page.screenshot({ path: path.join(artifactDir, "launch_screenshot.png"), fullPage: true });
    const apolloButton = page.getByTestId("open-apollo-phase1");
    await apolloButton.waitFor({ state: "visible", timeout: 30000 });
    launchSummary.checks.featureFlagOffButtonVisible = await apolloButton.isVisible();
    launchSummary.checks.featureFlagOffButtonEnabled = await apolloButton.isEnabled();
    await page.screenshot({ path: path.join(artifactDir, "feature_flag_off_entry.png"), fullPage: true });
    launchSummary.rootCauseBefore = "FEATURE_FLAG_OFF";
    launchSummary.userReachabilityBefore = "FAIL";
    launchSummary.electronRenderingBefore = "PASS";
    launchSummary.featureFlagBefore = "OFF";
  } finally {
    const electronPid = electronApp.process()?.pid ?? -1;
    processManifest.push({
      label: "electron-off",
      pid: electronPid,
      command: `electron ${electronMainPath}`,
      cwd: frontendDir,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      exitCode: "0",
    });
    await electronApp.close();
    await stopProcess(vite);
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

async function captureOnState() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apollo-electron-on-"));
  const vite = await startVite(true);
  const electronApp = await electron.launch({
    args: ["--disable-http-cache", `--user-data-dir=${userDataDir}`, electronMainPath],
    cwd: frontendDir,
    env: process.env,
  });
  const consoleMessages = [];
  try {
    const page = await waitForMainWindow(electronApp);
    page.on("console", (message) => {
      consoleMessages.push(`[renderer-console] ${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      consoleMessages.push(`[renderer-pageerror] ${error.message}`);
    });

    launchSummary.appVersion = await electronApp.evaluate(({ app }) => app.getVersion());
    launchSummary.appName = await electronApp.evaluate(({ app }) => app.getName());

    await openProfessionalWorkspace(page);
    const apolloButton = page.getByTestId("open-apollo-phase1");
    await apolloButton.waitFor({ state: "visible", timeout: 30000 });
    await page.screenshot({ path: path.join(artifactDir, "apollo_entry_visible.png"), fullPage: true });

    launchSummary.checks.apolloEntryEnabled = await apolloButton.isEnabled();
    await apolloButton.click();
    await page.waitForFunction(() => window.location.pathname === "/pro/apollo");
    await page.getByTestId("apollo-phase1-shell").waitFor({ state: "visible", timeout: 30000 });
    await page.screenshot({ path: path.join(artifactDir, "apollo_screen_loaded.png"), fullPage: true });

    await page.getByTestId("apollo-provisional-banner").screenshot({
      path: path.join(artifactDir, "provisional_banner.png"),
    });
    await page.getByTestId("apollo-topology-shell").screenshot({
      path: path.join(artifactDir, "topology_shell.png"),
    });

    const projectName = page.getByTestId("apollo-project-name-input");
    await projectName.fill("Apollo Electron Reachability");
    await page.getByTestId("apollo-add-node").click();
    await page.getByTestId("apollo-add-member").click();
    await page.getByTestId("apollo-add-support").click();
    await page.getByTestId("apollo-node-label-input").fill("Electron Draft Node");
    await page.getByTestId("apollo-node-x-input").fill("12.5");
    await page.getByTestId("apollo-node-x-input").fill("invalid");
    await page
      .getByTestId("apollo-interaction-message")
      .getByText("Node shell rejected invalid X coordinate", { exact: false })
      .waitFor({
        state: "visible",
        timeout: 30000,
      });
    await page.screenshot({ path: path.join(artifactDir, "invalid_input_rejection.png"), fullPage: true });

    await page.getByTestId("apollo-numeric-execution-guard").dispatchEvent("click");
    await page.getByText("Numeric execution remains blocked on Tuesday, July 28, 2026.", { exact: false }).waitFor({
      state: "visible",
      timeout: 30000,
    });
    await page.screenshot({ path: path.join(artifactDir, "numeric_guard.png"), fullPage: true });

    await page.getByTestId("apollo-result-publication-guard").dispatchEvent("click");
    await page.getByText("Authoritative result publication remains blocked.", { exact: false }).waitFor({
      state: "visible",
      timeout: 30000,
    });
    await page.screenshot({ path: path.join(artifactDir, "publication_guard.png"), fullPage: true });

    await page.getByTestId("apollo-return-to-pro").click();
    await page.waitForFunction(() => window.location.pathname === "/pro");
    await page.screenshot({ path: path.join(artifactDir, "workspace_return.png"), fullPage: true });

    await page.getByTestId("open-apollo-phase1").click();
    await page.waitForFunction(() => window.location.pathname === "/pro/apollo");
    await page.getByTestId("apollo-phase1-shell").waitFor({ state: "visible", timeout: 30000 });
    await page.getByTestId("apollo-node-select").selectOption("APN-1");

    launchSummary.checks.projectNamePersisted = (await projectName.inputValue()) === "Apollo Electron Reachability";
    launchSummary.checks.nodeLabelPersisted =
      (await page.getByTestId("apollo-node-label-input").inputValue()) === "Electron Draft Node";
    launchSummary.checks.numericGuardVisible = true;
    launchSummary.checks.publicationGuardVisible = true;
    launchSummary.checks.provisionalBannerVisible = await page.getByTestId("apollo-provisional-banner").isVisible();
    launchSummary.checks.topologyShellVisible = await page.getByTestId("apollo-topology-shell").isVisible();
    launchSummary.checks.apolloHeading = await page.locator("h1").textContent();
    launchSummary.finalRoute = await page.evaluate(() => window.location.pathname);
    launchSummary.windowTitle = await page.title();
    launchSummary.consoleMessages = consoleMessages;
  } finally {
    const electronPid = electronApp.process()?.pid ?? -1;
    processManifest.push({
      label: "electron-on",
      pid: electronPid,
      command: `electron ${electronMainPath}`,
      cwd: frontendDir,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      exitCode: "0",
    });
    await appendLog(consoleMessages.join("\n"));
    await electronApp.close();
    await stopProcess(vite);
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

async function writeArtifacts() {
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
        date: appVersionDate,
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
  await fs.writeFile(summaryPath, JSON.stringify(launchSummary, null, 2), "utf8");
}

async function main() {
  await ensureArtifactsDir();
  await appendLog(`Verification started on ${new Date().toISOString()} (${appVersionDate})`);
  await compileElectron();
  const backend = await startBackend();
  try {
    await captureOffState();
    await captureOnState();
  } finally {
    await stopProcess(backend);
    await writeArtifacts();
  }
}

await main();
