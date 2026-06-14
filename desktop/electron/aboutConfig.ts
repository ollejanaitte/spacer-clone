export const REPO_URL = "https://github.com/Masaharu-Oda/spacer-clone";
export const RELEASES_URL = `${REPO_URL}/releases`;

export const APP_NAME_FALLBACK = "Spacer Clone";

export function buildAboutDetail(version: string, appName: string, repoUrl: string): string {
  return [
    `${appName} は三次元立体骨組み解析の社内試用版です。`,
    "",
    `Version: ${version}`,
    `Repository: ${repoUrl}`,
    "",
    "応答スペクトル解析、固有値解析、影響線解析をサポートしています。",
  ].join("\n");
}

export function describeReleaseCheckStatus(
  ok: boolean,
  status: number,
  errorMessage: string | null,
  releasesUrl: string,
): string {
  if (errorMessage) {
    return `リリースページへの接続に失敗しました: ${errorMessage}`;
  }
  if (ok) {
    return "最新リリース情報を確認します。GitHub の Releases ページを開きますか?";
  }
  return `リリースページにアクセスできません (HTTP ${status})。手動で ${releasesUrl} を確認してください。`;
}
