#!/usr/bin/env python3
"""Apply targeted additions to frontend/src/i18n/ja.ts."""
from __future__ import annotations
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "frontend" / "src" / "i18n" / "ja.ts"
def main() -> int:
    text = PATH.read_text(encoding="utf-8")

    old_controls_tail = '        resultScale: "結果図",\n      },'
    new_controls_tail = (
        '        resultScale: "結果図",\n'
        '        reactionLegend: "凡例: RFX/RFY/RFZは全体座標系の反力、RMX/RMY/RMZは全体座標系の反力モーメント。'
        '部材端FX/FY/FZ/MX/MY/MZは部材ローカル座標系の断面力で、SPACER座標系表示ON時も符号・成分名は解析結果の部材座標系のまま表示。",\n'
        '        forceColorMap: "断面力カラーマップ",\n'
        '        forceColorMapToggle: "カラーマップ表示",\n'
        '        displaySize: "表示サイズ",\n'
        '        nodeSize: "節点サイズ",\n'
        '        supportSize: "支点サイズ",\n'
        '        loadArrowSize: "荷重矢印サイズ",\n'
        '        labelSize: "ラベルサイズ",\n'
        '        memberLineWidth: "部材線幅",\n'
        '        displaySizeReset: "表示サイズをリセット",\n'
        '        decreaseSize: (info: { label: string }) => `${info.label}を小さく`,\n'
        '        increaseSize: (info: { label: string }) => `${info.label}を大きく`,\n'
        '        numericValue: (info: { label: string }) => `${info.label}数値`,\n'
        '      },'
    )
    if old_controls_tail not in text:
        print("viewer.controls tail not found", file=sys.stderr); return 1
    text = text.replace(old_controls_tail, new_controls_tail, 1)

    old_viewer_messages_close = (
        '        memberLabel: "部材",\n'
        '        fallback: "簡易",\n'
        '      },\n'
        '  },'
    )
    new_viewer_messages_close = (
        '        memberLabel: "部材",\n'
        '        fallback: "簡易",\n'
        '      },\n'
        '    memberForce: {\n'
        '      components: {\n'
        '        N: "軸力 N",\n'
        '        Vy: "せん断 Vy",\n'
        '        Vz: "せん断 Vz",\n'
        '        My: "曲げ My",\n'
        '        Mz: "曲げ Mz",\n'
        '        Mt: "ねじり Mt",\n'
        '        Qy: "せん断 Vy",\n'
        '        Qz: "せん断 Vz",\n'
        '        Mx: "ねじり Mt",\n'
        '      } as Record<string, string>,\n'
        '      valueTypes: {\n'
        '        max: "最大値",\n'
        '        min: "最小値",\n'
        '        absMax: "絶対最大値",\n'
        '        average: "平均値",\n'
        '      } as Record<string, string>,\n'
        '    },\n'
        '    colorStops: {\n'
        '      small: "小",\n'
        '      medium: "中",\n'
        '      large: "大",\n'
        '    },\n'
        '    reactionSection: {\n'
        '      title: "反力表示",\n'
        '      numericLabels: "数値ラベル",\n'
        '    },\n'
        '    memberForceSection: {\n'
        '      title: "部材端力表示",\n'
        '      endValueLabels: "部材端値ラベル",\n'
        '      componentLabel: "表示成分",\n'
        '      targetLabel: "表示対象",\n'
        '    },\n'
        '  },'
    )
    if old_viewer_messages_close not in text:
        print("viewer.messages close not found", file=sys.stderr); return 1
    text = text.replace(old_viewer_messages_close, new_viewer_messages_close, 1)

    old_comparison_tail = (
        '    planMoreReaction: "最大橋脚反力はB案で大きくなるため、支点・基礎の照査が必要です。",\n'
        '  },'
    )
    new_comparison_tail = (
        '    planMoreReaction: "最大橋脚反力はB案で大きくなるため、支点・基礎の照査が必要です。",\n'
        '    heading: "A/B 比較",\n'
        '    lead: "Aは読取専用、Bのみ編集可能です。",\n'
        '    copyFromAToB: "AをBにコピー",\n'
        '    returnToMain: "通常画面へ戻る",\n'
        '    modelAHeading: "モデルA",\n'
        '    modelAReadOnly: "読取専用",\n'
        '    modelAAnalyze: "Aを解析",\n'
        '    modelBHeading: "モデルB",\n'
        '    modelBEditable: "編集可能",\n'
        '    modelBAnalyze: "Bを解析",\n'
        '    analyzing: "解析中...",\n'
        '    emptyHint: "「AをBにコピー」で比較モデルを作成してください。",\n'
        '  },'
    )
    if old_comparison_tail not in text:
        print("comparison tail not found", file=sys.stderr); return 1
    text = text.replace(old_comparison_tail, new_comparison_tail, 1)

    old_results_tabs = (
        '    tabs: {\n'
        '      results: "解析結果",\n'
        '      errors: "エラー",\n'
        '      warnings: "警告",\n'
        '      logs: "ログ",\n'
        '    },'
    )
    new_results_tabs = (
        '    tabs: {\n'
        '      results: "解析結果",\n'
        '      errors: "エラー",\n'
        '      warnings: "警告",\n'
        '      logs: "ログ",\n'
        '      howToRead: "使い方",\n'
        '    },'
    )
    if old_results_tabs not in text:
        print("resultsPanel.tabs not found", file=sys.stderr); return 1
    text = text.replace(old_results_tabs, new_results_tabs, 1)

    old_result_view = (
        '    resultView: {\n'
        '      static: "静的",\n'
        '      eigen: "固有値",\n'
        '      response: "応答スペクトル",\n'
        '      influence: "影響線",\n'
        '      timeHistory: "時刻歴",\n'
        '    },'
    )
    new_result_view = old_result_view.rstrip(",") + '\n      movingLoad: "移動荷重",\n    },'
    if old_result_view not in text:
        print("resultsPanel.resultView not found", file=sys.stderr); return 1
    text = text.replace(old_result_view, new_result_view, 1)

    old_unit = (
        '    unit: {\n'
        '      ms: (ms: string) => `${ms} ms`,\n'
        '    },\n'
        '\n'
        '  },'
    )
    new_unit = (
        '    unit: {\n'
        '      ms: (ms: string) => `${ms} ms`,\n'
        '    },\n'
        '    movingLoadHeading: "移動荷重結果",\n'
        '    movingLoadCase: (info: { id: string }) => `ケース: ${info.id}`,\n'
        '    movingLoadMember: (info: { id: string }) => `走行部材: ${info.id}`,\n'
        '    movingLoadStations: (info: { count: number }) => `station数: ${info.count}`,\n'
        '    movingLoadMagnitude: (info: { value: string; unit: string }) => `荷重: ${info.value} ${info.unit}`,\n'
        '    movingLoadEnvelopTitle: "包絡結果",\n'
        '    movingLoadWorstPositionTitle: "最悪載荷位置",\n'
        '    memberForceDetailHeading: "部材断面力詳細",\n'
        '    memberForceDetailMemberId: (info: { id: string }) => `部材ID: ${info.id}`,\n'
        '    memberForceDetailLabel: (info: { label: string }) => `表示名: ${info.label}`,\n'
        '    memberForceDetailNodeI: (info: { id: string }) => `i端節点: ${info.id}`,\n'
        '    memberForceDetailNodeJ: (info: { id: string }) => `j端節点: ${info.id}`,\n'
        '    memberForceTableComponent: "成分",\n'
        '    memberForceTableIEnd: "i端値",\n'
        '    memberForceTableJEnd: "j端値",\n'
        '    memberForceTableUnit: "単位",\n'
        '    movingLoadTab: "移動荷重",\n'
        '    howToRead: {\n'
        '      title: "結果の読み方",\n'
        '      instruction: "節点変位や反力は、値が正なら座標軸の正方向を意味します。",\n'
        '      description: "各タブでは、解析条件に対応する最大値・最小値・絶対最大値を確認できます。"\n'
        '    },\n'
        '\n'
        '  },'
    )
    if old_unit not in text:
        print("resultsPanel.unit close not found", file=sys.stderr); return 1
    text = text.replace(old_unit, new_unit, 1)

    final_close = "};\n\nexport type JaDictionary = typeof ja;\n"
    new_blocks = (
        "  defaults: {\n"
        '    newMaterialName: "材料",\n'
        '    newSectionName: "断面",\n'
        '    newLoadCaseName: "荷重ケース",\n'
        '    newBridgeName: "新規橋梁",\n'
        '    newBridgeDescription: "Bridge Wizard で作成された橋梁モデル",\n'
        '    movingLoadCaseName: "単一集中移動荷重",\n'
        '    movingLoadPointName: "単一集中荷重 P1",\n'
        "  },\n"
        "\n"
        "  appShell: {\n"
        '    timeHistoryEntryAriaLabel: "時刻歴応答解析を開く",\n'
        '    timeHistoryEntryDescription: "時刻歴応答解析は、専用ウィザードから地震波設定、入力チェック、解析実行、結果表示、アニメーション確認を行います。",\n'
        "  },\n"
        "\n"
        "  level0: {\n"
        '    currentConditionsHeading: "現在の条件",\n'
        '    parameterPanelHeading: "条件を変えて試す",\n'
        '    parameterPanelLead: "スライダーを動かして、橋の条件を少し変えてみましょう。",\n'
        '    bridgeLengthShort: "橋長:",\n'
        '    pierHeightShort: "橋脚高さ:",\n'
        '    pierCountShort: "橋脚本数:",\n'
        '    loadMultiplierShort: "荷重倍率:",\n'
        "    bridgeLengthUnitMeters: (value: number) => `${value} m`,\n"
        "    pierCountValue: (count: number) => `${count} 本`,\n"
        "    loadMultiplierValue: (value: string) => `${value} 倍`,\n"
        '    multiplierSmall: "0.5 倍",\n'
        '    multiplierLarge: "2.0 倍",\n'
        '    resetToDefaults: "初期値に戻す",\n'
        '    calculateResult: "結果を計算",\n'
        '    unreflectedNote: "一部の条件は表示説明にのみ反映されます。",\n'
        "    samples: {\n"
        '      shortBridge: { name: "短い橋" },\n'
        '      standardBridge: { name: "標準的な橋" },\n'
        '      tallPierBridge: { name: "高い橋脚の橋" },\n'
        "    },\n"
        "    descriptions: {\n"
        '      shortBridge: "短い橋",\n'
        '      longBridge: "長い橋",\n'
        '      tallPier: "高い橋脚",\n'
        '      shortPier: "低い橋脚",\n'
        '      singleSpan: "単支間",\n'
        '      multiSpan: "多支間",\n'
        '      heavyLoad: "重い荷重",\n'
        '      lightLoad: "軽い荷重",\n'
        '      default: "標準的な条件の橋です。",\n'
        "      compose: (parts: string) => `${parts}の橋です。`,\n"
        "    },\n"
        "  },\n"
        "};\n"
    )
    new_final_close = new_blocks + "\nexport type JaDictionary = typeof ja;\n"
    if final_close not in text:
        print("final close not found", file=sys.stderr); return 1
    text = text.replace(final_close, new_final_close, 1)

    PATH.write_text(text, encoding="utf-8")
    print(f"Updated {PATH} ({len(text)} chars)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
