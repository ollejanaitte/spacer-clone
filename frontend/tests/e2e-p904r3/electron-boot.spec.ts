import { test, expect, _electron as electron } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const EVIDENCE_DIR = path.resolve(__dirname, "../../../docs/rebuild/evidence");
function evidencePath(name: string): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, name);
}

const ELECTRON_MAIN = path.resolve(__dirname, "../../../desktop/electron/dist/main.js");

test("Electron real-screen boot + home page", async () => {
  test.setTimeout(90000);
  const app = await electron.launch({
    args: [ELECTRON_MAIN, "--disable-gpu", "--in-process-gpu", "--no-sandbox"],
    env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ":0", SPACER_AUTOMATION: "1" },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  // the main window loads http://127.0.0.1:5173/app itself
  await page.waitForSelector("[data-testid=home-page]", { timeout: 30000 });
  await page.screenshot({ path: evidencePath("p9-04r3-13-electron-home.png") });
  await app.close();
  // placeholder to satisfy expect import
  expect(true).toBe(true);
});
