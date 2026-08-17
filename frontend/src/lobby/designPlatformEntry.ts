/**
 * Design Platform entry path for the professional ("実務編") mode.
 *
 * G-5: production App を1つに統一。Lobby の「実務編」は canonical な
 * /app (NextApp / PDC Project System) の業務一覧へ導く。
 * 旧 DesignPlatform (/pro/platform) は legacy/reference として /app から
 * 明示リンクのみで到達可能とする (redirect/compatibility)。
 */
export const DESIGN_PLATFORM_ENTRY_PATH = "/app/business";
