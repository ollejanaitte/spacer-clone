/**
 * UI/3Dテスト共通setup (vitest.ui.config.ts / vitest.3d.config.ts の setupFiles から読込)。
 *
 * - React 19 の act() をテスト環境で有効化する
 *   (IS_REACT_ACT_ENVIRONMENT を設定し、
 *   "The current testing environment is not configured to support act(...)" を解消)。
 * - jsdom には canvas 実装が無いため、必要最小限の 2D コンテキストスタブを提供する。
 *   これは console 抑制ではなく、jsdom が欠いている API を補う標準的な対処。
 *   canvas 描画が本質的に必要な場合は 3D / E2E 側で検証する。
 *
 * このファイルは node 環境 (jsdom 未使用) のテストにも読み込まれるため、
 * DOM/canvas が存在する環境でのみスタブを導入する。
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

if (typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined") {
  installCanvas2DContextStub();
}

function installCanvas2DContextStub(): void {
  const noop = () => undefined;
  const stub = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const target: Record<string, unknown> = {
      canvas,
      fillStyle: "#000",
      strokeStyle: "#000",
      lineWidth: 1,
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic",
      globalAlpha: 1,
      shadowBlur: 0,
      measureText: () => ({ width: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createPattern: () => null,
      getImageData: (_x: number, _y: number, width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      toDataURL: () => "",
    };
    return new Proxy(target, {
      get(object, prop) {
        if (typeof prop !== "string") return undefined;
        if (prop in object) return object[prop];
        return noop;
      },
    }) as unknown as CanvasRenderingContext2D;
  };
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value(this: HTMLCanvasElement) {
      return stub(this);
    },
  });
}
