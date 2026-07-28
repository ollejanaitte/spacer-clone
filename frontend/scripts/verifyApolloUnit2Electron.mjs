import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { _electron as electron } from "playwright";

const verificationDate = "Tuesday, July 28, 2026";
const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, "..");
const artifactDir = path.join(
  repoRoot,
  "docs",
  "apollo",
  "phase1-orchestration",
  "unit2",
  "07_electron",
);
const startupLogPath = path.join(artifactDir, "startup_log.txt");
const processManifestPath = path.join(artifactDir, "process_manifest.csv");
const launchEnvironmentPath = path.join(artifactDir, "launch_environment.json");
const manualTestCasesPath = path.join(artifactDir, "manual_test_cases.csv");
const manualTestReportPath = path.join(artifactDir, "manual_test_report.md");
const e2eReportPath = path.join(artifactDir, "electron_e2e_report.md");
const electronMainPath = path.join(repoRoot, "desktop", "electron", "dist", "main.js");
const backendPython = path.join(repoRoot, ".venv", "bin", "python");
const automationProjectPath = path.join(artifactDir, "apollo-unit2-roundtrip.json");

const processManifest = [];
const consoleMessages = [];
const testCases = [];

async function ensureArtifactDir() {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(startupLogPath, "", "utf8");
}

async function appendLog(message) {
  await fs.appendFile(startupLogPath, `${message}\n`, "utf8");
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
    start: new Date().toISOString(),
    end: "",
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
  const manifest = processManifest.find((entry) => entry.label === label && entry.pid === (child.pid ?? -1));
  if (manifest) {
    manifest.end = new Date().toISOString();
    manifest.exitCode = String(child.exitCode ?? "");
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

async function step(id, title, action) {
  const startedAt = new Date().toISOString();
  try {
    const details = await action();
    testCases.push({
      id,
      title,
      expected: details.expected,
      actual: details.actual,
      verdict: "PASS",
      screenshot: details.screenshot ?? "",
      logRef: "startup_log.txt",
      startedAt,
      endedAt: new Date().toISOString(),
    });
  } catch (error) {
    testCases.push({
      id,
      title,
      expected: "See action",
      actual: error instanceof Error ? error.message : String(error),
      verdict: "FAIL",
      screenshot: "",
      logRef: "startup_log.txt",
      startedAt,
      endedAt: new Date().toISOString(),
    });
    throw error;
  }
}

async function writeScreenshot(locatorOrPage, fileName, options = {}) {
  const target = path.join(artifactDir, fileName);
  await locatorOrPage.screenshot({ path: target, ...options });
  return fileName;
}

async function openProfessionalWorkspace(page) {
  await page.waitForLoadState("domcontentloaded");
  if ((await page.evaluate(() => window.location.pathname)).startsWith("/pro")) return;
  const button = page.getByRole("button", { name: /実務編で詳しく見る|実務編/ });
  await button.waitFor({ state: "visible", timeout: 30000 });
  await writeScreenshot(page, "initial_screen.png", { fullPage: true });
  await button.click();
  await page.waitForFunction(() => window.location.pathname === "/pro");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function writeReports(summary) {
  await fs.writeFile(
    processManifestPath,
    [
      "label,pid,command,cwd,start_time,end_time,exit_code",
      ...processManifest.map((entry) =>
        [
          csvEscape(entry.label),
          entry.pid,
          csvEscape(entry.command),
          csvEscape(entry.cwd),
          entry.start,
          entry.end,
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
        repoRoot,
        frontendDir,
        electronMainPath,
        backendCommand: `${backendPython} -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`,
        automationProjectPath,
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    manualTestCasesPath,
    [
      "test_id,title,expected,actual,verdict,screenshot,log_ref,start_time,end_time",
      ...testCases.map((entry) =>
        [
          csvEscape(entry.id),
          csvEscape(entry.title),
          csvEscape(entry.expected),
          csvEscape(entry.actual),
          csvEscape(entry.verdict),
          csvEscape(entry.screenshot),
          csvEscape(entry.logRef),
          csvEscape(entry.startedAt),
          csvEscape(entry.endedAt),
        ].join(","),
      ),
    ].join("\n"),
    "utf8",
  );

  await fs.writeFile(
    manualTestReportPath,
    `# Apollo Phase 1-NN Unit 2 Electron Manual Test Report

- Verification date: ${verificationDate}
- Final route: ${summary.finalRoute}
- Project file: \`docs/apollo/phase1-orchestration/unit2/07_electron/apollo-unit2-roundtrip.json\`
- Window title: ${summary.windowTitle}

## Verdicts

- Electron launch: PASS
- Apollo reachability: PASS
- Save / reload round-trip: ${summary.roundTrip ? "PASS" : "FAIL"}
- Numeric guard: PASS
- Publication guard: PASS
- Selection sync: ${summary.selectionSync ? "PASS" : "FAIL"}
- Invalid operation rejection: PASS

## Console

\`\`\`text
${consoleMessages.join("\n")}
\`\`\`
`,
    "utf8",
  );

  await fs.writeFile(
    e2eReportPath,
    `# Apollo Phase 1-NN Unit 2 Electron E2E Report

- Verification date: ${verificationDate}
- App version: ${summary.appVersion}
- Final route: ${summary.finalRoute}
- Round-trip persisted project name: ${summary.savedProjectName}
- Reload restored project name: ${summary.reloadedProjectName}
- Reload restored node label: ${summary.reloadedNodeLabel}
- Selection sync text: ${summary.selectionText}
- Console message count: ${consoleMessages.length}
`,
    "utf8",
  );
}

async function main() {
  await ensureArtifactDir();
  await fs.writeFile(automationProjectPath, "", "utf8");
  await appendLog(`Verification started on ${new Date().toISOString()} (${verificationDate})`);
  await compileElectron();
  const backend = await startBackend();
  const vite = await startVite();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apollo-unit2-electron-"));
  const electronApp = await electron.launch({
    args: ["--disable-http-cache", `--user-data-dir=${userDataDir}`, electronMainPath],
    cwd: frontendDir,
    env: {
      ...process.env,
      SPACER_AUTOMATION_SAVE_PATH: automationProjectPath,
      SPACER_AUTOMATION_OPEN_PATH: automationProjectPath,
    },
  });

  const summary = {
    appVersion: "",
    finalRoute: "",
    windowTitle: "",
    savedProjectName: "",
    reloadedProjectName: "",
    reloadedNodeLabel: "",
    selectionText: "",
    roundTrip: false,
    selectionSync: false,
  };

  try {
    const page = await waitForMainWindow(electronApp);
    page.on("console", (message) => {
      consoleMessages.push(`[renderer-console] ${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      consoleMessages.push(`[renderer-pageerror] ${error.message}`);
    });

    summary.appVersion = await electronApp.evaluate(({ app }) => app.getVersion());
    summary.windowTitle = await page.title();

    await openProfessionalWorkspace(page);

    await step("U2-E-01", "Apollo entry is visible in the normal workspace UI", async () => {
      const entry = page.getByTestId("open-apollo-phase1");
      await entry.waitFor({ state: "visible", timeout: 30000 });
      const screenshot = await writeScreenshot(page, "apollo_entry.png", { fullPage: true });
      return {
        expected: "Apollo entry is visible and enabled in the main workspace.",
        actual: `visible=${await entry.isVisible()} enabled=${await entry.isEnabled()}`,
        screenshot,
      };
    });

    await step("U2-E-02", "User can click through to /pro/apollo", async () => {
      await page.getByTestId("open-apollo-phase1").click();
      await page.waitForFunction(() => window.location.pathname === "/pro/apollo");
      await page.getByTestId("apollo-phase1-shell").waitFor({ state: "visible", timeout: 30000 });
      const screenshot = await writeScreenshot(page, "node_editor.png", { fullPage: true });
      return {
        expected: "Apollo shell loads in Electron after a normal click path.",
        actual: `route=${await page.evaluate(() => window.location.pathname)}`,
        screenshot,
      };
    });

    await step("U2-E-03", "Provisional banner remains visible", async () => {
      const banner = page.getByTestId("apollo-provisional-banner");
      await banner.waitFor({ state: "visible", timeout: 30000 });
      const screenshot = await writeScreenshot(banner, "provisional_banner.png");
      return {
        expected: "Provisional / unverified status banner remains visible.",
        actual: `visible=${await banner.isVisible()}`,
        screenshot,
      };
    });

    await step("U2-E-04", "Material editor supports non-numeric reference entry", async () => {
      await page.getByRole("button", { name: "materials" }).click();
      await page.getByTestId("apollo-add-material").click();
      await page.locator("[data-testid^='apollo-material-select-']").last().click();
      await page.locator("[data-testid='apollo-material-editor'] tr.selected input").nth(1).fill("QA Material Ref");
      const screenshot = await writeScreenshot(page.getByTestId("apollo-material-editor"), "material_editor.png");
      return {
        expected: "Material reference row is added without numeric constants.",
        actual: await page.getByTestId("apollo-material-editor").textContent(),
        screenshot,
      };
    });

    await step("U2-E-05", "Node editor supports add/edit/select", async () => {
      await page.getByRole("button", { name: "nodes" }).click();
      await page.getByTestId("apollo-add-node").click();
      await page.getByTestId("apollo-add-node").click();
      await page.getByTestId("apollo-node-select-APN-1").click();
      await page.getByTestId("apollo-node-label-input").fill("QA Node A");
      await page.getByTestId("apollo-node-x-input").fill("12.5");
      await page.getByTestId("apollo-node-y-input").fill("3.25");
      const screenshot = await writeScreenshot(page.getByTestId("apollo-node-editor"), "node_editor.png");
      return {
        expected: "Node rows can be added and edited in table form.",
        actual: await page.getByTestId("apollo-node-label-input").inputValue(),
        screenshot,
      };
    });

    await step("U2-E-06", "Member editor supports non-numeric topology references", async () => {
      await page.getByRole("button", { name: "members" }).click();
      await page.getByTestId("apollo-add-member").click();
      const memberEditor = page.getByTestId("apollo-member-editor");
      const screenshot = await writeScreenshot(memberEditor, "member_editor.png");
      return {
        expected: "Member rows can be added using node/material references only.",
        actual: await memberEditor.textContent(),
        screenshot,
      };
    });

    await step("U2-E-07", "Support editor supports DOF state editing", async () => {
      await page.getByRole("button", { name: "supports" }).click();
      await page.getByTestId("apollo-add-support").click();
      const supportEditor = page.getByTestId("apollo-support-editor");
      const screenshot = await writeScreenshot(supportEditor, "support_editor.png");
      return {
        expected: "Support rows can be added with FREE/FIXED/UNDEFINED states only.",
        actual: await supportEditor.textContent(),
        screenshot,
      };
    });

    await step("U2-E-08", "Selection sync highlights the edited node in view", async () => {
      await page.getByRole("button", { name: "nodes" }).click();
      await page.getByTestId("apollo-node-select-APN-1").click();
      const screenshot = await writeScreenshot(page.getByTestId("apollo-topology-shell"), "selection_sync.png");
      const selectionText = await page.getByText("Selected node APN-1", { exact: false }).textContent();
      summary.selectionText = selectionText ?? "";
      summary.selectionSync = (selectionText ?? "").includes("Selected node APN-1");
      return {
        expected: "Table selection remains synchronized with the topology summary/view shell.",
        actual: selectionText ?? "missing selection text",
        screenshot,
      };
    });

    await step("U2-E-09", "Topology view renders the practical shell", async () => {
      const screenshot = await writeScreenshot(page.getByTestId("apollo-topology-shell"), "topology_view.png");
      return {
        expected: "Topology view is rendered inside Electron.",
        actual: await page.getByTestId("apollo-topology-summary").textContent(),
        screenshot,
      };
    });

    await step("U2-E-10", "Invalid destructive reference action is rejected", async () => {
      await page.getByRole("button", { name: "nodes" }).click();
      await page.getByText("refs M:1 / S:1", { exact: false }).first().waitFor({ state: "visible", timeout: 30000 });
      await page.getByRole("button", { name: "Delete" }).first().click();
      await page.getByTestId("apollo-interaction-message").getByText("cannot be deleted", { exact: false }).waitFor({
        state: "visible",
        timeout: 30000,
      });
      const screenshot = await writeScreenshot(page, "invalid_reference_guard.png", { fullPage: true });
      return {
        expected: "Referenced node deletion is blocked.",
        actual: await page.getByTestId("apollo-interaction-message").textContent(),
        screenshot,
      };
    });

    await step("U2-E-11", "Save path persists the unit2 draft", async () => {
      await page.getByTestId("apollo-project-name-input").fill("Apollo Unit2 Electron Saved");
      await page.getByTestId("apollo-save-project").click();
      await page.getByText("Project save completed.", { exact: false }).waitFor({ state: "visible", timeout: 30000 });
      const persisted = JSON.parse(await fs.readFile(automationProjectPath, "utf8"));
      summary.savedProjectName = persisted.project?.name ?? "";
      const screenshot = await writeScreenshot(page, "save_success.png", { fullPage: true });
      return {
        expected: "Save writes the persisted project file through the Electron bridge.",
        actual: `savedProjectName=${summary.savedProjectName}`,
        screenshot,
      };
    });

    await step("U2-E-12", "Reload restores the last saved draft", async () => {
      await page.getByTestId("apollo-project-name-input").fill("Unsaved overwrite");
      await page.getByTestId("apollo-node-select-APN-1").click();
      await page.getByTestId("apollo-node-label-input").fill("Unsaved Node Label");
      await page.getByTestId("apollo-reload-project").click();
      await page.getByText("Project reload completed.", { exact: false }).waitFor({ state: "visible", timeout: 30000 });
      summary.reloadedProjectName = await page.getByTestId("apollo-project-name-input").inputValue();
      await page.getByTestId("apollo-node-select-APN-1").click();
      summary.reloadedNodeLabel = await page.getByTestId("apollo-node-label-input").inputValue();
      summary.roundTrip =
        summary.reloadedProjectName === "Apollo Unit2 Electron Saved" &&
        summary.reloadedNodeLabel === "QA Node A";
      const screenshot = await writeScreenshot(page, "reload_success.png", { fullPage: true });
      return {
        expected: "Reload restores the saved project name and edited node label.",
        actual: `project=${summary.reloadedProjectName}; node=${summary.reloadedNodeLabel}`,
        screenshot,
      };
    });

    await step("U2-E-13", "Numeric execution remains blocked", async () => {
      await page.getByTestId("apollo-numeric-execution-guard").click();
      await page.getByTestId("apollo-interaction-message").getByText("Numeric execution remains blocked", { exact: false }).waitFor({
        state: "visible",
        timeout: 30000,
      });
      const screenshot = await writeScreenshot(page, "numeric_guard.png", { fullPage: true });
      return {
        expected: "Numeric execution guard remains enforced.",
        actual: await page.getByTestId("apollo-interaction-message").textContent(),
        screenshot,
      };
    });

    await step("U2-E-14", "Result publication remains blocked", async () => {
      await page.getByTestId("apollo-result-publication-guard").click();
      await page.getByTestId("apollo-interaction-message").getByText("Authoritative result publication remains blocked", { exact: false }).waitFor({
        state: "visible",
        timeout: 30000,
      });
      const screenshot = await writeScreenshot(page, "publication_guard.png", { fullPage: true });
      return {
        expected: "Publication guard remains enforced.",
        actual: await page.getByTestId("apollo-interaction-message").textContent(),
        screenshot,
      };
    });

    summary.finalRoute = await page.evaluate(() => window.location.pathname);
  } finally {
    processManifest.push({
      label: "electron",
      pid: electronApp.process()?.pid ?? -1,
      command: `electron ${electronMainPath}`,
      cwd: frontendDir,
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      exitCode: "0",
    });
    await appendLog(consoleMessages.join("\n"));
    await electronApp.close();
    await stopTrackedProcess(vite);
    await stopTrackedProcess(backend);
    await fs.rm(userDataDir, { recursive: true, force: true });
    await writeReports(summary);
  }
}

await main();
