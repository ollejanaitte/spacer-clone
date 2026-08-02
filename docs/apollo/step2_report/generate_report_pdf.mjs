/**
 * Generate development report PDF from ReportModel HTML via Playwright Chromium.
 * Artifact is written outside git (tmp) unless OUT path is provided.
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPkg = path.resolve(__dirname, "../../../frontend/package.json");
const require = createRequire(frontendPkg);
const { chromium } = require("playwright");

async function main() {
  const htmlPath = process.argv[2];
  const outPath =
    process.argv[3] ??
    path.join("/tmp", `apollo-development-report_${Date.now()}.pdf`);
  if (!htmlPath) {
    console.error("Usage: node generate_report_pdf.mjs <report.html> [out.pdf]");
    process.exit(2);
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  await browser.close();
  const buf = fs.readFileSync(outPath);
  const report = {
    overall: buf.length > 1000 && buf.subarray(0, 4).toString() === "%PDF" ? "PASS" : "FAIL",
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    outPath,
    note: "PDF binary not committed to git; generated from ReportModel HTML",
  };
  fs.writeFileSync(path.join(__dirname, "pdf_generation_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (report.overall !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
