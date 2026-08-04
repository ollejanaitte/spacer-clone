import type { GuidedSlideDefinition, GuidedSlideId } from "./types";
import { GUIDED_SLIDE_IDS } from "./types";

/**
 * G01–G15 candidate order from Step 5-1 / DEC-S5-0009.
 * L1 copy is Japanese; internal keys remain in primaryFields for catalog mapping.
 */
export const GUIDED_SLIDE_DEFINITIONS: readonly GuidedSlideDefinition[] = [
  {
    slideId: "G01",
    order: 1,
    theme: "プロジェクト / サンプル",
    decideWhat: "サンプル適用可否と免責の確認",
    primaryFields: ["sample ID", "disclaimer ack"],
    wfAnchor: "start",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "橋梁入力パネル" },
    impactHints: ["3D: サンプル適用後に更新", "数量・荷重: 生成後に反映"],
  },
  {
    slideId: "G02",
    order: 2,
    theme: "道路線形",
    decideWhat: "線形バインド状態の確認（将来工程まで計画中可）",
    primaryFields: ["alignment bind status"],
    wfAnchor: "WF-01",
    detailEscape: { kind: "route", path: "/pro/liner", label: "道路線形" },
    impactHints: ["3D: 座標系は将来対応", "数量・荷重: まだなし"],
  },
  {
    slideId: "G03",
    order: 3,
    theme: "舗装 / 区画線",
    decideWhat: "舗装の有無・厚さ・区画線表示の確認",
    primaryFields: ["pavement presence", "thickness", "marking toggles"],
    wfAnchor: "pavement",
    detailEscape: { kind: "panel", panelId: "wf-panel-pavement", label: "舗装・区画線パネル" },
    impactHints: ["3D: 舗装・区画線", "数量・荷重: 舗装死荷重（ありの場合）"],
  },
  {
    slideId: "G04",
    order: 4,
    theme: "橋梁基本条件",
    decideWhat: "橋種・支間・幅員など基本寸法",
    primaryFields: ["bridgeSystem", "spanLength", "width"],
    wfAnchor: "WF-02",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "橋梁基本条件入力" },
    impactHints: ["3D: 全体外形", "数量・荷重: 基準値"],
  },
  {
    slideId: "G05",
    order: 5,
    theme: "主桁",
    decideWhat: "主桁本数・間隔・断面寸法",
    primaryFields: ["girderCount", "girderSpacing", "section dims"],
    wfAnchor: "WF-02/WF-04",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "主桁断面入力" },
    impactHints: ["3D: 主桁", "数量: 鋼重"],
  },
  {
    slideId: "G06",
    order: 6,
    theme: "床版",
    decideWhat: "床版厚",
    primaryFields: ["deckThickness"],
    wfAnchor: "WF-02/WF-03",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "床版入力" },
    impactHints: ["3D: 床版", "数量・荷重: RC床版"],
  },
  {
    slideId: "G07",
    order: 7,
    theme: "ハンチ",
    decideWhat: "主桁ごとのハンチの有無と寸法",
    primaryFields: ["haunch presence", "haunch dims"],
    wfAnchor: "WF-05",
    detailEscape: { kind: "panel", panelId: "wf-panel-haunch", label: "ハンチ入力" },
    impactHints: ["3D: ハンチ", "数量・荷重: ハンチRC"],
  },
  {
    slideId: "G08",
    order: 8,
    theme: "橋面付属物",
    decideWhat: "地覆・壁高欄等スロットの有無と寸法",
    primaryFields: ["appurtenance slots"],
    wfAnchor: "WF-03",
    detailEscape: { kind: "panel", panelId: "wf-panel-appurtenance", label: "床版・橋面付属物入力" },
    impactHints: ["3D: 付属物", "数量・荷重: 付属物死荷重"],
  },
  {
    slideId: "G09",
    order: 9,
    theme: "横桁 / 対傾構",
    decideWhat:
      "横桁間隔・対傾構間隔・対傾構取付深さ（上/下/中央）。横桁と対傾構は別部材です。取付点は未検証・利用者編集可です。",
    primaryFields: [
      "crossBeamSpacing（横桁）",
      "swayBracingInterval（対傾構間隔）",
      "upperAttachmentDepthFromGirderTop",
      "lowerAttachmentDepthFromGirderTop",
      "centerNodeDepthFromGirderTop",
      "pattern=V (IMPLEMENTED)",
    ],
    wfAnchor: "WF-02",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "横桁・対傾構入力" },
    impactHints: ["3D: 横桁・対傾構取付", "数量: 二次鋼材", "深さ変更で要再計算"],
  },
  {
    slideId: "G10",
    order: 10,
    theme: "上下横構",
    decideWhat: "上横構・下横構の有無と L 形断面パラメータ",
    primaryFields: ["lateralBracingEnabled", "upperLateralBracingEnabled", "L params"],
    wfAnchor: "WF-02",
    detailEscape: { kind: "panel", panelId: "wf-panel-bridge-structure", label: "横構入力" },
    impactHints: ["3D: 横構", "数量: 横構鋼材"],
  },
  {
    slideId: "G11",
    order: 11,
    theme: "荷重",
    decideWhat: "派生死荷重サマリの確認（編集は詳細パネル）",
    primaryFields: ["dead load summary"],
    wfAnchor: "WF-07",
    detailEscape: { kind: "panel", panelId: "wf-panel-load-confirmation", label: "荷重確認パネル" },
    impactHints: ["数量・荷重: 確認"],
  },
  {
    slideId: "G12",
    order: 12,
    theme: "3D確認",
    decideWhat: "可視グループのチェックリスト確認",
    primaryFields: ["visibility checklist"],
    wfAnchor: "WF-11",
    detailEscape: { kind: "viewer", label: "3Dビューア" },
    impactHints: ["3D: 確認"],
  },
  {
    slideId: "G13",
    order: 13,
    theme: "数量",
    decideWhat: "開発用数量サマリの確認",
    primaryFields: ["quantity summary"],
    wfAnchor: "WF-10",
    detailEscape: { kind: "panel", panelId: "wf-panel-quantity", label: "数量パネル" },
    impactHints: ["数量: 確認"],
  },
  {
    slideId: "G14",
    order: 14,
    theme: "解析接続",
    decideWhat: "解析接続状態の確認",
    primaryFields: ["analysis hookup status"],
    wfAnchor: "WF-08",
    detailEscape: { kind: "panel", panelId: "wf-panel-analysis", label: "解析パネル" },
    impactHints: ["解析: 状態確認のみ"],
  },
  {
    slideId: "G15",
    order: 15,
    theme: "成果物",
    decideWhat: "成果物パッケージは未実装であることの明示",
    primaryFields: ["deliverables pending message"],
    wfAnchor: "WF-13",
    detailEscape: { kind: "panel", panelId: "wf-panel-output", label: "出力パネル" },
    impactHints: ["成果物: 対象外（将来工程まで）"],
  },
] as const;

const BY_ID = new Map(GUIDED_SLIDE_DEFINITIONS.map((slide) => [slide.slideId, slide]));

export function getGuidedSlideDefinition(slideId: GuidedSlideId): GuidedSlideDefinition {
  const slide = BY_ID.get(slideId);
  if (!slide) {
    throw new Error(`Unknown guided slide: ${slideId}`);
  }
  return slide;
}

export function isGuidedSlideId(value: string): value is GuidedSlideId {
  return (GUIDED_SLIDE_IDS as readonly string[]).includes(value);
}

export function adjacentGuidedSlide(
  slideId: GuidedSlideId,
  direction: "back" | "next",
): GuidedSlideId | null {
  const index = GUIDED_SLIDE_IDS.indexOf(slideId);
  if (index < 0) return null;
  const nextIndex = direction === "back" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= GUIDED_SLIDE_IDS.length) return null;
  return GUIDED_SLIDE_IDS[nextIndex] ?? null;
}
