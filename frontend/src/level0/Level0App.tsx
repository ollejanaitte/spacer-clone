import { useState, useCallback } from "react";
import { Home } from "./pages/Home";
import { QuakePicker } from "./pages/QuakePicker";
import { QuakeRun } from "./pages/QuakeRun";
import { ResultPage } from "./pages/ResultPage";
import { Level0ErrorCard } from "./components/Level0ErrorCard";
import { RestoreBanner } from "./components/RestoreBanner";
import { Level0ErrorBoundary } from "./components/Level0ErrorBoundary";
import { createLevel0Store, type Level0State, type EarthquakePresetId } from "./state/level0Store";
import { loadLevel0State, clearLevel0State } from "./services/level0Autosave";
import { classify } from "./services/resultClassifier";

type Level0AppProps = { onOpenProMode?: () => void };

export function Level0App({ onOpenProMode }: Level0AppProps) {
  const [store] = useState(() => createLevel0Store());
  const [state, setState] = useState<Level0State>(store.getState());
  const [restoredData, setRestoredData] = useState(loadLevel0State());

  const updateState = useCallback(() => setState({ ...store.getState() }), [store]);

  const handleError = useCallback((errorCode: string) => { store.setError(errorCode); store.goto("error"); updateState(); }, [store, updateState]);

  return (
    <Level0ErrorBoundary onError={handleError}>
      <div className="level0-app">
        {restoredData && <RestoreBanner onRestore={() => { store.setProject(restoredData.project); store.setPreset(restoredData.preset as EarthquakePresetId); store.goto("picker"); updateState(); setRestoredData(null); }} onDismiss={() => { setRestoredData(null); clearLevel0State(); }} />}
        {state.step === "home" && <Home onShake={() => { store.goto("picker"); updateState(); }} onOpenProMode={() => onOpenProMode?.()} />}
        {state.step === "picker" && <QuakePicker onShake={(preset: EarthquakePresetId) => { store.setPreset(preset); store.goto("running"); updateState(); }} onBack={() => { store.reset(); updateState(); }} />}
        {state.step === "running" && <QuakeRun onAnalysisComplete={() => { store.setResult(null, { nodeId: "N007", valueCm: 12, timeSec: 15 }, classify(12, 20)); store.goto("animation"); updateState(); }} onAnalysisError={handleError} />}
        {state.step === "animation" && <div className="level0-animation"><p>アニメーション再生中...</p><button type="button" onClick={() => { store.goto("result"); updateState(); }}>結果を見る</button></div>}
        {state.step === "result" && state.judgement && state.maxDisplacement && <ResultPage judgement={state.judgement} maxDisplacement={state.maxDisplacement} onRetry={() => { store.goto("picker"); updateState(); }} onOther={() => { store.reset(); updateState(); }} onPro={() => onOpenProMode?.()} />}
        {state.step === "error" && <Level0ErrorCard errorCode={state.errorCode ?? "UNKNOWN_ERROR"} onRetry={() => { store.goto("picker"); updateState(); }} onHome={() => { store.reset(); updateState(); }} />}
      </div>
    </Level0ErrorBoundary>
  );
}
