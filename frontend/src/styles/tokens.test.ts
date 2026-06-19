import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const tokenCss = readFileSync(
  fileURLToPath(new URL("./tokens.css", import.meta.url)),
  "utf8",
);

function token(name: string): string {
  const match = tokenCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing color token --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("time-history dark theme contrast tokens", () => {
  const darkestRelevantPanel = "#1d2b45";

  it.each([
    ["th-color-text-primary", 4.5],
    ["th-color-text-secondary", 4.5],
    ["th-color-placeholder", 3],
    ["th-color-chip-text", 4.5],
  ])("%s meets its WCAG target", (name, minimum) => {
    expect(contrast(token(name), darkestRelevantPanel)).toBeGreaterThanOrEqual(minimum);
  });
});
