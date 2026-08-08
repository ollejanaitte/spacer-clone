// Phase C1 (M2-08) サンプル作成ダイアログ
// P03 Freeze: 空 / サンプル / LINER支点から生成。
// 生成値は「参考・サンプル値」であり設計標準値ではないことを明示する。
import { useState } from "react";
import { ja } from "../../../i18n/ja";
import { SAMPLE_COMBOS, type SampleKind } from "./sampleGenerator";

export interface SampleCreationDialogProps {
  onGenerate: (kind: SampleKind, supportId: string) => void;
  onGenerateCombo: (comboId: string) => void;
  onGenerateFromLiner: () => void;
  onClose: () => void;
  /** LINER 支点があるか */
  hasLinerSupports?: boolean;
}

const SINGLE_KINDS: { kind: SampleKind; label: string }[] = [
  { kind: "abutment_inverted_t", label: "逆T式橋台" },
  { kind: "abutment_cantilever", label: "ラーメン式橋台" },
  { kind: "pier_single", label: "単柱矩形橋脚" },
  { kind: "pier_wall", label: "壁式橋脚" },
  { kind: "pier_portal", label: "門型橋脚" },
  { kind: "foundation_spread", label: "直接基礎" },
  { kind: "foundation_bored", label: "場所打ち杭" },
  { kind: "foundation_steel", label: "鋼管杭" },
];

export function SampleCreationDialog(props: SampleCreationDialogProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const [supportId, setSupportId] = useState("S1");

  return (
    <div
      data-testid="sample-creation-dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, 'Noto Sans JP', sans-serif",
      }}
    >
      <div
        style={{
          background: "#172238",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 20,
          width: 520,
          maxHeight: "80vh",
          overflow: "auto",
          color: "#f1f5f9",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>
          {t.sampleDialogTitle ?? "サンプル新規作成"}
        </div>
        <div style={{ fontSize: 12, color: "#fdba74", marginBottom: 12 }}>
          {t.sampleReferenceNotice ?? "生成値は参考・サンプル値です。設計標準値ではありません。"}
        </div>

        <div style={{ fontWeight: 600, fontSize: 13, margin: "8px 0 4px" }}>
          {t.sampleSingleTitle ?? "単一サンプル"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {SINGLE_KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              data-testid={`sample-${k.kind}`}
              onClick={() => props.onGenerate(k.kind, supportId)}
              style={{
                background: "#1d2b45",
                color: "#f1f5f9",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
          {t.sampleSupportId ?? "supportId"}
          <input
            type="text"
            value={supportId}
            onChange={(e) => setSupportId(e.target.value)}
            data-testid="sample-support-id"
            style={{
              background: "#0e1726",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 13,
            }}
          />
        </label>

        <div style={{ fontWeight: 600, fontSize: 13, margin: "8px 0 4px" }}>
          {t.sampleComboTitle ?? "組合せサンプル"}
        </div>
        {SAMPLE_COMBOS.map((c) => (
          <button
            key={c.id}
            type="button"
            data-testid={`combo-${c.id}`}
            onClick={() => props.onGenerateCombo(c.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "#1d2b45",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 6,
            }}
          >
            {c.label}
          </button>
        ))}

        <button
          type="button"
          data-testid="sample-from-liner"
          disabled={!props.hasLinerSupports}
          onClick={props.onGenerateFromLiner}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: props.hasLinerSupports ? "#3b82f6" : "#1d2b45",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px",
            fontSize: 13,
            cursor: props.hasLinerSupports ? "pointer" : "not-allowed",
            margin: "8px 0",
            opacity: props.hasLinerSupports ? 1 : 0.5,
          }}
        >
          {t.sampleFromLiner ?? "LINER支点から自動生成"}
        </button>

        <button
          type="button"
          data-testid="sample-close"
          onClick={props.onClose}
          style={{
            width: "100%",
            background: "transparent",
            color: "#a8b8cc",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            padding: "8px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t.sampleClose ?? "閉じる"}
        </button>
      </div>
    </div>
  );
}
