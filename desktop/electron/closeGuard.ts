// Phase H-05: /pro App Shell (旧Apollo NN) を撤去したため、/pro を対象とする
// クローズガードは不要になった。通常業務フローは /app のみ。
export function shouldPromptCloseGuardFromUrl(_url: string): boolean {
  return false;
}
