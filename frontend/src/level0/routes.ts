// 設計書 §29 のルーティング定義
export type Level0Route = "/level0" | "/level0/picker" | "/level0/run" | "/level0/result" | "/level0/error";

export const LEVEL0_ROUTES: Record<Level0Route, string> = {
  "/level0": "Home",
  "/level0/picker": "QuakePicker",
  "/level0/run": "QuakeRun",
  "/level0/result": "ResultPage",
  "/level0/error": "Level0ErrorCard",
};

export function isLevel0Route(pathname: string): boolean {
  return pathname.startsWith("/level0");
}
