// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNativeProjectFileDialogAvailable,
  openProjectFile,
  saveProjectFile,
  showAboutDialog,
} from "./projectFileDialog";

afterEach(() => {
  delete window.spacerDesktop;
  vi.restoreAllMocks();
});

describe("projectFileDialog adapter", () => {
  it("detects the native bridge when present", () => {
    window.spacerDesktop = {
      openProjectFile: vi.fn(),
      saveProjectFile: vi.fn(),
      showAbout: vi.fn(),
      platform: "linux",
    };
    expect(isNativeProjectFileDialogAvailable()).toBe(true);
  });

  it("delegates open to the native bridge", async () => {
    const openProjectFileMock = vi.fn().mockResolvedValue({
      canceled: false,
      fileName: "project.json",
      content: "{}",
    });
    window.spacerDesktop = {
      openProjectFile: openProjectFileMock,
      saveProjectFile: vi.fn(),
      showAbout: vi.fn(),
      platform: "linux",
    };
    const result = await openProjectFile();
    expect(openProjectFileMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ canceled: false, fileName: "project.json", content: "{}" });
  });

  it("delegates save to the native bridge", async () => {
    const saveProjectFileMock = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: "/tmp/project.json",
    });
    window.spacerDesktop = {
      openProjectFile: vi.fn(),
      saveProjectFile: saveProjectFileMock,
      showAbout: vi.fn(),
      platform: "linux",
    };
    const result = await saveProjectFile("{}", "project.json");
    expect(saveProjectFileMock).toHaveBeenCalledWith("{}", "project.json");
    expect(result).toEqual({ canceled: false, filePath: "/tmp/project.json" });
  });

  it("delegates showAbout to the native bridge", async () => {
    const showAboutMock = vi.fn().mockResolvedValue(undefined);
    window.spacerDesktop = {
      openProjectFile: vi.fn(),
      saveProjectFile: vi.fn(),
      showAbout: showAboutMock,
      platform: "linux",
    };
    await showAboutDialog();
    expect(showAboutMock).toHaveBeenCalledTimes(1);
  });

  it("uses browser download fallback when the bridge is absent", async () => {
    const click = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return { click, download: "", href: "" } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tagName);
    });
    const result = await saveProjectFile("{}", "project.json");
    expect(click).toHaveBeenCalled();
    expect(result).toEqual({ canceled: false, filePath: "project.json" });
    createElementSpy.mockRestore();
  });
});
