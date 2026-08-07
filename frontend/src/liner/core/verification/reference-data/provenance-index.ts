export type ProvenanceIndexEntry = {
  source_document: string;
  source_page: string;
  source_section?: string;
  source_table?: string;
  categories: string[];
  note?: string;
};

export const PROVENANCE_INDEX: ProvenanceIndexEntry[] = [
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "7",
    source_section: "平面線形 (CL)",
    source_table: "平 面 線 形",
    categories: ["horizontal_alignment", "station"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "8",
    source_section: "平面線形 (ECL)",
    source_table: "平 面 線 形",
    categories: ["horizontal_alignment"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "9",
    source_section: "平面線形 (HCL)",
    source_table: "平 面 線 形",
    categories: ["horizontal_alignment", "station"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "10",
    source_section: "縦断線形 (HCL)",
    source_table: "縦 断 線 形",
    categories: ["vertical_profile"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "13",
    source_section: "3.1 大座標",
    source_table: "橋軸線",
    categories: ["crossfall", "section_height"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-LINER-SAMPLE",
    source_page: "74",
    source_section: "§4 H-4号橋支点上構造高",
    source_table: "支点上構造高",
    categories: ["hoso", "haunch", "section_height"],
    note: "JIP-LINER 実出力 サンプル計算書",
  },
  {
    source_document: "SRC-DESIGN-CALC",
    source_page: "10",
    source_section: "1.3 基本寸法一覧",
    source_table: "主桁支間長 / 主桁格間長",
    categories: ["span", "girder_panel_length", "ldist"],
    note: "鋼鈑桁橋設計計算例",
  },
  {
    source_document: "SRC-DESIGN-CALC",
    source_page: "11",
    source_section: "1.3 基本寸法一覧",
    source_table: "横断間隔長",
    categories: ["transverse_spacing"],
    note: "鋼鈑桁橋設計計算例",
  },
  {
    source_document: "SRC-DESIGN-CALC",
    source_page: "13",
    source_section: "1.3 基本寸法一覧",
    source_table: "主桁格点座標",
    categories: ["girder_point"],
    note: "鋼鈑桁橋設計計算例",
  },
  {
    source_document: "SRC-DESIGN-CALC",
    source_page: "14",
    source_section: "1.3 基本寸法一覧",
    source_table: "床版張出し長(法線方向)",
    categories: ["overhang"],
    note: "鋼鈑桁橋設計計算例",
  },
  {
    source_document: "SRC-DESIGN-CALC",
    source_page: "15",
    source_section: "1.3 基本寸法一覧",
    source_table: "曲率(主桁中心)",
    categories: ["girder_span_length"],
    note: "鋼鈑桁橋設計計算例",
  },
  {
    source_document: "SRC-DRAWING",
    source_page: "1",
    source_section: "構造要素",
    source_table: "一般図",
    categories: ["section_height", "drawing_coordinate"],
    note: "鋼鈑桁橋図面例",
  },
  {
    source_document: "SRC-DRAWING",
    source_page: "10",
    source_section: "材料表",
    source_table: "舗装・床版",
    categories: ["hoso", "haunch", "drawing_coordinate"],
    note: "鋼鈑桁橋図面例",
  },
];
