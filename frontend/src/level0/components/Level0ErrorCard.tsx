type Level0ErrorCardProps = { errorCode: string; onRetry: () => void; onHome: () => void };

export function Level0ErrorCard({ errorCode, onRetry, onHome }: Level0ErrorCardProps) {
  return (
    <div className="level0-error-card">
      <h2>エラーが発生しました</h2>
      <p>{errorCode}</p>
      <button type="button" onClick={onRetry}>もう一度ゆらす</button>
      <button type="button" onClick={onHome}>ホームにもどる</button>
    </div>
  );
}
