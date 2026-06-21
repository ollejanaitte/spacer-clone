import { useEffect, useState } from "react";
import { L0_STRINGS } from "../data/level0Strings";

type QuakeRunProps = {
  onAnalysisComplete: () => void;
  onAnalysisError: (errorCode: string) => void;
};

export function QuakeRun({ onAnalysisComplete, onAnalysisError }: QuakeRunProps) {
  const text = L0_STRINGS.run;
  const [countdown, setCountdown] = useState(3);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    setComputing(true);
  }, [countdown]);

  useEffect(() => {
    if (!computing) return;
    // ダミーの解析完了（実際には T14 の fakeAnalysisRunner を呼ぶ）
    const timer = setTimeout(() => {
      onAnalysisComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [computing, onAnalysisComplete]);

  if (countdown > 0) {
    return (
      <div className="level0-quake-run">
        <div className="level0-countdown">
          {countdown === 3 && text.countdown3}
          {countdown === 2 && text.countdown2}
          {countdown === 1 && text.countdown1}
        </div>
      </div>
    );
  }

  return (
    <div className="level0-quake-run">
      <div className="level0-computing">{text.computing}</div>
    </div>
  );
}
