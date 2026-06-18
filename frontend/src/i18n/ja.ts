// Centralized Japanese UI strings.
//
// All user-facing Japanese text in the React UI lives in this module.
// The policy is documented in docs/development/language-policy.md.
//
// - Source code identifiers (variables, types, functions, hooks, components) are English.
// - Comments in the source code are English.
// - The keys below are organized by feature / component.
// - Values are the Japanese strings rendered in the UI.

export const ja = {
  common: {
    add: "追加",
    remove: "削除",
    delete: "削除",
    close: "閉じる",
    save: "保存",
    cancel: "キャンセル",
    ok: "OK",
    yes: "はい",
    no: "いいえ",
    back: "戻る",
    next: "次へ",
    done: "完了",
    addRow: "+ 追加",
    removeRow: "削除",
    notAvailable: "なし",
    pleaseCheckInput: "入力内容を確認してください。",
    total: "合計",
    none: "なし",
  },

  app: {
    appMark: "SC",
    versionPrefix: "Version",
  },

  toolbar: {
    unsavedChanges: "未保存の変更あり",
    saved: "保存済み",
    newTitle: "新しいモデルを作成します。",
    newButton: "新規",
    openTitle: "ローカルPC上の project.json を開きます。",
    openButton: "開く",
    bridgeWizardTitle: "橋梁3D骨組モデルをウィザード形式で作成します。",
    bridgeWizardButton: "橋梁モデル作成",
    saveTitle: "現在のモデルを project.json として保存します。",
    saveButton: "保存",
    validateTitle: "入力データに不足や誤りがないか確認します。",
    validateButton: "入力チェック",
    runStaticTitle: "線形静的解析を実行します。",
    runStaticButton: "静的解析",
    runEigenTitle: "固有値解析を実行します。",
    runEigenButton: "固有値",
    runResponseTitle: "応答スペクトル解析を実行します。",
    runResponseButton: "応答",
    runInfluenceTitle: "選択部材の影響線解析を実行します。",
    runInfluenceButton: "影響線",
    outputGroupAriaLabel: "結果出力",
    outputGroupLabel: "出力",
    exportCsvTitle: "解析結果をCSVで保存します。",
    exportCsvButton: "CSV",
    exportPdfTitle: "解析結果をPDF帳票として出力します。",
    exportPdfButton: "PDF帳票",
    exportJsonTitle: "解析結果をJSONで保存します。",
    exportJsonButton: "JSON",
  },

  statusLabels: {
    analysisPending: "未実行",
    analysisRunning: "実行中",
    analysisSuccess: "成功",
    analysisWarning: "警告あり",
    analysisFailed: "失敗",
    validationOk: "検証OK",
    validationError: "検証エラー",
    validationPending: "未検証",
  },

  propertyPanel: {
    panelLabel: "プロパティ",
    panelAriaLabel: "プロパティ",
    treeAriaLabel: "プロジェクトツリー",
    actionAriaLabel: "操作",
    rowDeleteTitle: "行を削除",
    rowAdd: "+ 行を追加",
    rowEmpty: "行がありません。",
    runResultsHint: "解析を実行すると、下部の解析結果パネルに結果が表示されます。",
    loadCaseEmptyHint: "荷重ケースを追加してください。",
    fieldUnit: {
      kN: "単位は kN です。",
      kNPerM: "単位は kN/m です。",
      kNm: "単位は kN_m です。",
      kNm2: "単位は kN/m2 です。",
      m2: "単位は m2 です。",
      m4: "単位は m4 です。",
      massCoef: "単位は kN*s^2/m です。",
    } as Record<string, string>,
    columns: {
      projectId: "ID",
      projectName: "プロジェクト名",
      schemaVersion: "スキーマ",
      description: "説明",
      createdAt: "作成日時",
      updatedAt: "更新日時",
      nodeId: "ID",
      x: "X座標 [m]",
      y: "Y座標 [m]",
      z: "Z座標 [m]",
      displayName: "表示名",
      memberId: "ID",
      memberNodeI: "始点節点 nodeI",
      memberNodeJ: "終点節点 nodeJ",
      materialId: "材料ID",
      sectionId: "断面ID",
      orientationVector: "向きベクトルY",
      materialName: "材料名",
      elasticModulus: "ヤング係数 E",
      shearModulus: "せん断弾性係数 G",
      poissonRatio: "ポアソン比 ν",
      density: "密度",
      sectionName: "断面名",
      area: "断面積 A",
      iy: "断面二次モーメント Iy",
      iz: "断面二次モーメント Iz",
      j: "ねじり定数 J",
      supportNodeId: "節点ID",
      ux: "X方向変位 UX",
      uy: "Y方向変位 UY",
      uz: "Z方向変位 UZ",
      rx: "X軸回り回転 RX",
      ry: "Y軸回り回転 RY",
      rz: "Z軸回り回転 RZ",
      loadCaseName: "荷重ケース名",
      loadCaseType: "種類",
      loadCaseRefId: "荷重ケースID",
      nodalFx: "X方向力 Fx",
      nodalFy: "Y方向力 Fy",
      nodalFz: "Z方向力 Fz",
      nodalMx: "X軸回りモーメント Mx",
      nodalMy: "Y軸回りモーメント My",
      nodalMz: "Z軸回りモーメント Mz",
      memberLoadCoordSystem: "座標系",
      memberLoadType: "種類",
      memberLoadWx: "部材分布荷重 wx",
      memberLoadWy: "部材分布荷重 wy",
      memberLoadWz: "部材分布荷重 wz",
      massCaseName: "質量ケース名",
      massCaseMethod: "方式",
      massCaseSource: "入力元",
      massItemMx: "Mx質量 UX",
      massItemMy: "My質量 UY",
      massItemMz: "Mz質量 UZ",
      massItemIrx: "IRX",
      massItemIry: "IRY",
      massItemIrz: "IRZ",
      analysisType: "解析種類",
      includeShearDeformation: "せん断変形",
      largeDisplacement: "大変位解析",
      tolerance: "収束許容値",
      period: "周期",
      spectrumValue: "スペクトル値",
    } as Record<string, string>,
    help: {
      shearDeformationLocked: "MVPでは変更できません。",
      largeDisplacementLocked: "MVPでは変更できません。",
      massItemIrZero: "MVPでは0のまま使用します。",
      orientationVector: "部材の局所軸の向きを決める補助値です。",
      period: "区間内は線形補間、範囲外は端値固定です。負値は使用できません。",
      spectrumValue: "負値は使用できません。",
    } as Record<string, string>,

    coordinatesSystemLocal: "部材ローカル座標",
    coordinatesSystemGlobal: "全体座標",
    massCaseLabel: "質量ケース",
    massCaseAriaLabel: "質量ケース",
    massCaseEmpty: "質量ケースなし",
    modeCountLabel: "モード数",
    modeCountAriaLabel: "モード数",
    directionLabel: "方向",
    directionAriaLabel: "方向",
    dampingRatioLabel: "減衰比",
    dampingRatioAriaLabel: "減衰比",
    targetCumulativeMassRatioLabel: "目標累積有効質量比",
    targetCumulativeMassRatioAriaLabel: "目標累積有効質量比",
    combinationMethodLabel: "モード合成方法",
    combinationMethodAriaLabel: "モード合成方法",
    combinationMethodSRSS: "SRSS（既定）",
    combinationMethodCQC: "CQC",
    interpolationLabel: "スペクトル補間",
    interpolationAriaLabel: "スペクトル補間",
    interpolationLinear: "線形補間（既定）",
    interpolationLogLog: "log-log 補間",
    spectrumCaseIdLabel: "スペクトルケースID",
    spectrumCaseIdAriaLabel: "スペクトルケースID",
    spectrumPointsHeading: "スペクトル点（線形補間）",
    responseSpectrumHeading: "応答スペクトル解析設定",
    emptyState: "先に質量ケースを登録してください。",
    addLoadCasePrompt: "荷重ケースを追加してください。",
    sectionTitles: {
      project: "プロジェクト",
      nodes: "節点",
      members: "部材",
      materials: "材料",
      sections: "断面",
      supports: "支点条件",
      loadCases: "荷重ケース",
      nodalLoads: "節点荷重",
      memberLoads: "部材荷重",
      massCases: "質量",
      analysisSettings: "解析設定",
      results: "解析結果",
    } as Record<string, string>,
    loadTypeStatic: "静的",
    loadTypeUniform: "等分布",
    analysisTypeLinearStatic: "線形静的解析",
    descriptions: {
      project: "プロジェクト名や説明など、保存ファイル全体の基本情報です。",
      nodes: "節点は骨組みの接続点です。座標X/Y/Zをm単位で入力します。",
      members: "部材は2つの節点をつなぐ梁要素です。材料IDと断面IDを指定します。",
      materials: "材料はヤング係数E、せん断弾性係数G、ポアソン比などを設定します。",
      sections: "断面は断面積A、断面二次モーメントIy/Iz、ねじり定数Jを設定します。",
      supports: "支点条件は固定・ピンなどの拘束条件を6自由度で指定します。チェックありは拘束を表します。",
      loadCases: "荷重ケースは死荷重、活荷重など、荷重のまとまりです。MVPでは静的荷重のみ扱います。",
      nodalLoads: "節点荷重は節点に直接作用する力やモーメントです。力はkN、モーメントはkN_mです。",
      memberLoads: "部材荷重は部材に沿って作用する等分布荷重です。荷重強度はkN/mです。",
      massCases: "固有値解析用の集中質量です。MVPでは kN*s^2/m を節点のUX/UY/UZに直接入力します。",
      analysisSettings: "解析実行の設定です。MVPでは線形静的解析を対象にします。",
      results: "解析実行後の変位、反力、部材端力を確認します。",
    } as Record<string, string>,
  },

  resultsPanel: {
    tabs: {
      results: "解析結果",
      errors: "エラー",
      warnings: "警告",
      logs: "ログ",
    },
    resultView: {
      static: "静的",
      eigen: "固有値",
      response: "応答スペクトル",
      influence: "影響線",
      timeHistory: "時刻歴",
    },
    analysisType: {
      linear_static: "線形静的",
      eigen: "固有値",
      response_spectrum: "応答スペクトル",
      responseSpectrum: "応答スペクトル",
      influence_line: "影響線",
      time_history: "時刻歴応答",
    } as Record<string, string>,
    statusLabel: {
      success: "成功",
      warning: "警告あり",
      failed: "失敗",
    } as Record<string, string>,
    errorDescriptions: {
      INVALID_REFERENCE: "存在しない節点、部材、材料、断面などを参照しています。",
      MODEL_UNSTABLE: "支点条件が不足しています。",
      SOLVER_ERROR: "解析ソルバでエラーが発生しました。",
      SCHEMA_ERROR: "入力データの形式に誤りがあります。",
      DUPLICATE_ID: "同じIDが複数使用されています。",
      INVALID_VALUE: "数値が未設定、範囲外、または不正です。",
      ZERO_LENGTH_MEMBER: "部材のI端とJ端が同じ位置です。",
      POSTPROCESS_ERROR: "解析結果の整理中にエラーが発生しました。",
      DISCONNECTED_NODE: "部材に接続されていない節点があります。",
      WEBGL_INIT_FAILED: "3D表示を初期化できませんでした。",
      NETWORK_ERROR: "APIサーバーに接続できません。",
      VALIDATION_API_ERROR: "入力チェックAPIでエラーが発生しました。",
      ANALYSIS_API_ERROR: "解析実行APIでエラーが発生しました。",
      PROJECT_OPEN_ERROR: "project.jsonを開けませんでした。",
    } as Record<string, string>,
    metrics: {
      modalMass: "モード質量",
      maxDisplacement: "最大変位 (m/rad)",
      maxReaction: "最大反力 (kN, kN·m)",
      maxMemberForce: "最大断面力 (kN, kN·m)",
      participationFactorX: "刺激係数 X",
      participationFactorY: "刺激係数 Y",
      participationFactorZ: "刺激係数 Z",
      effectiveMassRatioX: "有効質量比 X",
      effectiveMassRatioY: "有効質量比 Y",
      effectiveMassRatioZ: "有効質量比 Z",
      effectiveMassX: "有効質量 X",
      effectiveMassY: "有効質量 Y",
      effectiveMassZ: "有効質量 Z",
      cumulativeEffectiveMassRatioX: "累積参加率 X",
      cumulativeEffectiveMassRatioY: "累積参加率 Y",
      cumulativeEffectiveMassRatioZ: "累積参加率 Z",
    },

    empty: "解析結果はまだありません。",
    errorsEmpty: "エラーはありません。",
    warningsEmpty: "警告はありません。",
    viewTabsAriaLabel: "結果表示切替",
    summary: {
      status: "状態",
      solver: "ソルバ",
      duration: "計算時間",
      freeDof: "自由度",
      freeDofValue: (free: number, total: number) => `${free}/${total} free`,
      analysisType: "解析種別",
      loadCase: "荷重ケース",
      loadCaseAll: "すべて",
      mode: (modeNo: number) => `Mode: ${modeNo}`,
      responseSpectrum: "応答",
      selection: "選択",
      selectionAll: "すべて",
    },
    overview: {
      spectrumCaseId: "スペクトル",
      direction: "方向",
      damping: "減衰",
      combination: "合成",
      show: "表示",
    },
    tables: {
      modalResponse: "モード別応答",
      combinationResult: (method: string) => `${method}合成結果`,
      maxDisplacement: "最大変位",
      maxReaction: "最大反力",
      maxMemberForce: "最大断面力",
      directionSummary: "方向別結果サマリ",
      directionSummaryEmpty: "方向別結果はありません",
      massPerDirection: "方向別総質量（kN·s²/m）",
      eigenModes: "固有モード一覧",
      selectedModeShape: "選択モード形",
      nodeDisplacement: "節点変位表",
      supportReaction: "支点反力表",
      memberSectionForce: "部材断面力表",
      influenceResults: "影響線結果",
      influenceSeries: "影響線系列",
      influenceValues: "影響線値",
      influenceChart: "影響線グラフ",
      influenceChartEmpty: "影響線系列がありません。",
      influencePickerAriaLabel: "影響線系列選択",
      influenceSelectAll: "全選択",
      influenceClearAll: "全解除",
      influenceNoSeriesSelected: "表示する系列を選択してください。",
      influenceAxis: {
        x: "走行位置比",
        y: "影響値",
        origin: "0",
        unit: "1",
      },
    },
    columns: {
      nodeId: "節点ID",
      memberId: "部材ID",
      component: "成分",
      magnitude: "並進合成",
      station: "位置",
      ratio: "位置比",
      target: "系列",
      type: "種別",
      label: "系列名",
      maxAbs: "最大絶対値",
      min: "最小",
      max: "最大",
      value: "値",
      direction: "方向",
      totalMass: "総質量",
      method: "方法",
      ux: "UX",
      uy: "UY",
      uz: "UZ",
      rx: "RX",
      ry: "RY",
      rz: "RZ",
      fx: "Fx",
      fy: "Fy",
      fz: "Fz",
      mx: "Mx",
      my: "My",
      mz: "Mz",
      i: "I端",
      j: "J端",
      modeNo: "Mode",
      eigenvalue: "λ",
      circularFrequency: "ω",
      frequency: "f",
      period: "T",
      modalMass: "モード質量",
      spectralAcceleration: "Sa",
      maxDisplacement: "最大変位 (m/rad)",
      maxReaction: "最大反力 (kN, kN·m)",
      maxMemberForce: "最大断面力 (kN, kN·m)",
      participationFactorX: "刺激係数 X",
      participationFactorY: "刺激係数 Y",
      participationFactorZ: "刺激係数 Z",
      effectiveMassRatioX: "有効質量比 X",
      effectiveMassRatioY: "有効質量比 Y",
      effectiveMassRatioZ: "有効質量比 Z",
      effectiveMassX: "有効質量 X",
      effectiveMassY: "有効質量 Y",
      effectiveMassZ: "有効質量 Z",
      cumulativeEffectiveMassRatioX: "累積参加率 X",
      cumulativeEffectiveMassRatioY: "累積参加率 Y",
      cumulativeEffectiveMassRatioZ: "累積参加率 Z",
    } as Record<string, string>,
    messageTable: {
      description: "説明",
      code: "コード",
      path: "場所",
      target: "対象",
      detail: "詳細",
    },
    fileScope: {
      case: "ケース",
      travelMember: "走行部材",
      stationCount: "分割数",
      unitLoad: "単位荷重",
      loadDirection: "荷重方向",
    },
    unit: {
      ms: (ms: string) => `${ms} ms`,
    },

  },

  timeHistory: {
    tab: "時刻歴",
    runTitle: "線形時刻歴応答解析を実行します。",
    runButton: "時刻歴",
    settingsHeading: "時刻歴応答解析設定",
    fields: {
      massCase: "質量ケース",
      groundMotion: "地震波",
      manageGroundMotions: "管理...",
      direction: "方向",
      directionX: "X",
      directionY: "Y",
      directionZ: "Z",
      timeStep: "時間刻み dt",
      duration: "解析時間",
      newmarkBeta: "Newmark β",
      newmarkGamma: "Newmark γ",
      rayleighAlpha: "Rayleigh α",
      rayleighBeta: "Rayleigh β",
      newmarkBetaFixedNote: "固定",
      runButton: "解析実行",
      clearButton: "結果をクリア",
    },
    units: {
      seconds: "s",
      meterPerSecondSquared: "m/s²",
      gal: "gal (cm/s²)",
    },
    status: {
      success: "成功",
      warning: "警告あり",
      failed: "失敗",
      running: "実行中",
      networkError: "通信エラー",
      notRun: "未実行",
    },
    error: {
      code: "エラーコード",
      path: "場所",
      message: "メッセージ",
      network: "APIサーバーに接続できません。",
    },
    empty: {
      massCases: "質量ケースなし",
      groundMotions: "地震波はまだありません。",
    },
    validation: {
      number: "有効な数値を入力してください。",
      samples: "サンプルにはカンマ区切りまたは改行区切りの数値を入力してください。",
      projectMissing: "プロジェクトがありません。",
    },
    groundMotionManager: {
      heading: "地震波管理",
      close: "閉じる",
      addNew: "+ 新規",
      importCsv: "CSV読込",
      importPeer: "PEER読込",
      columns: {
        id: "ID",
        name: "名称",
        direction: "方向",
        unit: "単位",
        timeStep: "dt",
        sampleCount: "サンプル数",
      },
      editor: {
        id: "ID",
        name: "名称",
        direction: "方向",
        unit: "単位",
        timeStep: "dt",
        samples: "サンプル",
      },
      futureFeatureNote: "今後対応",
      importFileLabel: "CSVファイル選択",
      importSuccess: (info: { fileName: string; sampleCount: number; timeStep: number; columns: number }) => `ファイル ${info.fileName} を読み込みました (サンプル数 ${info.sampleCount} / dt ${info.timeStep} s / 列数 ${info.columns})。`,
      importSuccessNoTimeStep: (info: { fileName: string; sampleCount: number; columns: number }) => `ファイル ${info.fileName} を読み込みました (サンプル数 ${info.sampleCount} / 列数 ${info.columns})。`,
      importErrorEmpty: "CSVファイルが空です。",
      importErrorNoNumericSamples: "CSVファイルに有効なサンプルがありません。",
      importErrorNonFinite: (info: { line: number; column: number; token: string }) => `${info.line}行目${info.column}列目に有効な数値ではないトークン "${info.token}" があります。`,
      importErrorInconsistentTimeStep: (info: { line: number; detail: string }) => `${info.line}行目に不一致な時間刻み: ${info.detail}`,
      importErrorUnsupportedColumns: (info: { detail: string }) => `未サポートの列数です: ${info.detail}`,
      importErrorColumnHint: (info: { line: number; column: number }) => `${info.line}行目${info.column}列目を確認してください。期待形式: カンマ区切りまたは空白区切りの数値。`,
      previewLabel: "プレビュー",
      previewSampleCount: (count: number) => `サンプル数: ${count}`,
      previewTimeStep: (dt: number) => `dt: ${dt.toFixed(4)} s`,
      previewDuration: (duration: number) => `持続時間: ${duration.toFixed(3)} s`,
      previewMax: (max: number, unit: string) => `max: ${max.toFixed(3)} ${unit}`,
      previewMin: (min: number, unit: string) => `min: ${min.toFixed(3)} ${unit}`,
      previewAbsMax: (absMax: number, unit: string) => `abs max: ${absMax.toFixed(3)} ${unit}`,
      sampleStatusOk: "サンプル数 OK",
      sampleStatusShort: (info: { expected: number; actual: number }) => `サンプル数不足: 必要 ${info.expected} / 現在 ${info.actual}`,
      sampleStatusLong: (info: { expected: number; actual: number }) => `サンプル数過剰: 必要 ${info.expected} / 現在 ${info.actual}`,
      sampleStatusUnknown: "duration / timeStep の入力が不足しているため検証できません",
      expectedSamples: (count: number) => `必要サンプル数 ${count}`,
      actualSamples: (count: number) => `現在サンプル数 ${count}`,
      runValidationWarning: "Run前の整合性チェックで警告があります。解析は実行されますが結果を確認してください。",
      importErrorFileRead: "CSVファイルを読み込めませんでした。",
      importH24: "H24道示波形インポート",
      importH24FileLabel: "H24道示波形ファイル選択",
      importH24Paste: "H24貼付",
      h24PastePrompt: "H24道示波形のテキストを貼り付けてください。",
      h24PasteFileName: "pasted-h24.txt",
      h24ImportSuccess: (info: { fileName: string; sampleCount: number; timeStep: number; duration: number; waveformCount: number }) => "H24ファイル " + info.fileName + " を読み込みました (" + String(info.waveformCount) + "波形 / " + String(info.sampleCount) + "サンプル / dt " + info.timeStep.toFixed(3) + " s / 持続時間 " + info.duration.toFixed(2) + " s)",
      h24ImportNoWaves: (info: { fileName: string }) => "H24ファイル " + info.fileName + " には波形列が見つかりませんでした。",
      h24PickerHeading: "H24 検出波形",
      h24PickerFile: (fileName: string) => "ファイル: " + fileName,
      h24PickerCount: (count: number) => "検出波形: " + String(count),
      h24PickerName: "波形",
      h24PickerSamples: "サンプル数",
      h24PickerTimeStep: "dt (s)",
      h24PickerDuration: "持続時間 (s)",
      h24PickerMax: "max (gal)",
      h24PickerMin: "min (gal)",
      h24PickerAbsMax: "abs max (gal)",
      h24PickerAction: "操作",
      h24PickerPick: "この波形を使用",
      h24ErrorNonFinite: (info: { line: number; column: number; token: string }) => String(info.line) + "行目" + String(info.column) + "列目に有効な数値ではないトークン \"" + info.token + "\" があります。",
      h24ErrorInconsistentTimeStep: (info: { line: number; detail: string }) => String(info.line) + "行目に不一致な時間刻み: " + info.detail,
      h24ErrorMissingTimeColumn: (info: { detail: string }) => "時間列の特定に失敗しました: " + info.detail,
    },
    animation: {
      heading: "アニメーション",
      play: "再生",
      pause: "一時停止",
      previous: "前へ",
      next: "次へ",
      reset: "リセット",
      speedLabel: "再生速度",
      speedOption: (multiplier: number) => `x${multiplier}`,
      displacementScaleLabel: "変形倍率",
      timeSliderLabel: (current: string, total: string) => `${current} / ${total}`,
      disabledNoResult: "解析結果がありません。",
      disabledNoDisplacement: "変位データがありません。",
      warningSampleMismatch: "サンプル数と時刻配列の長さが一致しません。短い方に合わせます。",
      warningNonFiniteValue: "非有限値が含まれるため 0 として扱います。",
      currentTimeLabel: (time: string, index: number, total: number) => `時刻 ${time} s (サンプル ${index + 1} / ${total})`,
      jumpToMax: "最大変位時刻へ",
      currentValueLabel: (value: string) => `現在値: ${value}`,
      maxAbsLabel: (value: string, time: string) => `abs max: ${value} @ ${time} s`,
      warningLargeScale: "変形倍率が大きすぎます。auto scale または小さな値を使用してください。",
      modeLabel: "変位モード",
      modeX: "X方向",
      modeY: "Y方向",
      modeZ: "Z方向",
      modeXyz: "XYZ合成",
    },
    resultViewer: {
      heading: "時刻歴応答",
      nodeLabel: "対象節点",
      dofLabel: "自由度",
      nodePlaceholder: "節点選択",
      dofPlaceholder: "自由度選択",
      seriesLabel: "系列",
      seriesDisplacement: "変位",
      seriesVelocity: "速度",
      seriesAcceleration: "加速度",
      availableKeys: "利用可能な応答",
      responseKeyLabel: "応答キー",
      selectedKey: "選択キー",
      selectedSeries: "選択系列",
      totalSamples: "総サンプル数",
      displayedSamples: "表示サンプル数",
      empty: "時刻歴応答結果はまだありません。",
      noResult: "時刻歴応答結果はありません。",
      summary: {
        status: "状態",
        analysisId: "解析ID",
        timeStep: "dt",
        duration: "解析時間",
        sampleCount: "サンプル数",
        method: "手法",
        availableKeysCount: "応答キー数",
        firstKey: "先頭応答キー",
      },
      table: {
        time: "Time",
        value: "Value",
        showing: (shown: number, total: number) => `${shown} / ${total} サンプル表示`,
      },
      chart: {
        title: "時刻歴チャート",
        xAxis: "Time",
        yAxis: "Value",
        empty: "チャート表示できる時刻歴応答結果はありません。",
        invalid: "チャート表示できる有効なデータがありません。",
        ariaLabel: "時刻歴応答チャート",
        pointCount: (shown: number, total: number) => `${shown} / ${total} 点表示`,
      },
      chartAriaLabel: "時刻歴応答グラフ",
    },
  },

  bridgeWizard: {
    title: "橋梁モデル作成",
    ariaLabel: "橋梁モデル作成ウィザード",
    saveSuccess: (id: string) => `保存しました: ${id}`,
    saveFailed: (detail: string) => `保存に失敗: ${detail}`,
    loadSuccess: (id: string) => `読み込みました: ${id}`,
    loadFailed: (detail: string) => `読み込みに失敗: ${detail}`,
    fileLoadSuccess: (name: string) => `ファイルから読み込みました: ${name}`,
    fileLoadFailed: (detail: string) => `ファイル読み込みに失敗: ${detail}`,
    downloadStarted: (name: string) => `ダウンロード: ${name}`,
    templateLoadError: (detail: string) => `テンプレート取得失敗: ${detail}。既定値で開始しています。`,
    existingBridgeId: "既存の bridge_id:",
    loadFromServer: "サーバーから読込",
    loadFromJsonFile: "JSON ファイル読込",
    savingLabel: "保存中...",
    saveButton: "保存",
    downloadJsonButton: "JSON ダウンロード",
    backLabel: "← 戻る",
    nextLabel: "次へ →",
    finishLabel: "完了",
    sendToAnalysis: "解析へ送る",
    hints: {
      step1: "道路の横断構成を入力すると、主桁候補 y 座標が自動で計算されます。",
      step2: "橋軸方向の支間長さを設定します。支間追加・削除で構造を変えてください。",
      step3: "衝撃係数は自動計算が推奨です。L_max から簡略式 i = min(0.3, 20 / (50 + L)) で算出します。",
      step4: "3D ビューで走行ラインや参照ラインを引きます。種別 traffic/load/reference を選んで描画してください。",
      step5: "荷重（自重 / 分布 / 車両）を追加します。ラインに紐づけることで FEM 生成時にマッピングされます。",
      step6: "メッシュ分割と密度を指定して FEM モデルを生成します。生成後は解析へ送れます。",
    },
    errors: {
      laneCountMin: "車線数は 1 以上",
      laneWidthPositive: "車線幅は 0 より大きい",
      laneTotalWidthPositive: "車線合計幅は 0 より大きい",
      spanUnset: "支間が未設定",
      spanLengthPositive: (index: number) => `支間 ${index} の長さは 0 より大きい`,
      impactFactorRange: "衝撃係数は 0..1",
      loadLineUndefined: (id: string) => `荷重 ${id} の line_id が未定義`,
      meshDivisionMin: "mesh_division は 1 以上",
    },
  },

  bridgeViewer: {
    defaultLineName: (n: number) => `ライン ${n}`,
    hintMode: "モード",
    hintStart: "始点",
    hintClickStart: "始点クリックで開始",
    hintClickEnd: "終点クリックで確定",
  },

  bridgeSteps: {
    step1: {
      title: "Step 1 / 6 道路条件",
      hint: "橋梁の横断構成を入力してください。主桁候補 y 座標が自動で計算されます。",
      laneCount: "車線数",
      laneWidth: "車線幅",
      medianWidth: "中央分離帯幅",
      sidewalkWidth: "歩道幅",
      barrierWidth: "高欄幅",
      previewHeading: "横断プレビュー（y 座標の概算）",
      previewCaption: "左端が高欄外端、末尾が右端。中央 0 が道路中心です。",
    },
    step2: {
      title: "Step 2 / 6 支間設定",
      hint: "橋軸方向の支間長さを設定してください。支間の追加・削除ができます。",
      headerIndex: "支間",
      headerLength: "支間長 (m)",
      headerOffset: "オフセット (m)",
      totalBridgeLength: (length: string) => `合計橋長: ${length} m`,
      totalSpans: (count: number) => `（${count} 支間）`,
      addSpan: "+ 支間追加",
    },
    step3: {
      title: "Step 3 / 6 衝撃係数",
      hint: "衝撃係数は自動計算が推奨です。自動 ON の場合、橋長に応じて下式で自動算出されます（MVP 簡略式）。",
      autoCompute: "自動計算",
      impactFactor: "衝撃係数 i",
      formula: "式（MVP）: i = min(0.3, 20 / (50 + L_max))",
      currentLmax: (value: string) => `現在の L_max: ${value} m`,
      computedValue: (value: string) => `算出値: ${value}`,
      note: "※ 道路橋示方書の正式式とは断定しません。MVP 簡略式として設計書に明記し、後続で正式式に差し替え可能。",
    },
    step4: {
      title: "Step 4 / 6 ライン設定 3D",
      hint: "3D ビューでラインを引き、荷重・走行・参照ラインを設定します。",
      typeHint: "種別: traffic=緑, load=赤, reference=灰, selected=黄",
      typeLabel: "種別:",
      nameLabel: "名前:",
      namePlaceholder: "ライン名（任意）",
      listHeading: (count: number) => `ライン一覧 (${count})`,
      empty: "ラインはまだありません。",
      selectedHeading: "選択中ライン",
      typeValue: (type: string) => `種別: ${type}`,
      startPoint: (coords: string) => `始点: ${coords}`,
      endPoint: (coords: string) => `終点: ${coords}`,
    },
    step5: {
      title: "Step 5 / 6 荷重設定",
      hint: "荷重を追加して、対象ラインと方向、値を設定してください。",
      empty: "荷重はまだありません。",
      noLine: "-- ラインなし --",
      newLoadName: "新しい荷重",
      addLoad: "+ 荷重追加",
      typeNotesHeading: "種類別の意味:",
      typeNotes: {
        selfWeight: "self_weight: 自重。全節点に magnitude / nodeCount を分散。",
        distributed: "distributed: 分布荷重。対象 line_id の x 範囲の部材に kN/m として割当。",
        vehicle: "vehicle: 車両荷重。対象 line_id 上の代表節点に kN として作用。",
      } as Record<string, string>,
    },
    step6: {
      title: "Step 6 / 6 FEMモデル生成",
      hint: "メッシュ分割と密度を指定して、FEM モデルを生成します。",
      meshDivision: "メッシュ分割数（支間あたり）",
      meshDensity: "メッシュ密度",
      runAnalysisAfterGen: "生成と同時に解析も実行",
      xNodeCount: "x 方向節点数",
      bridgeLength: "橋長",
      bridgeLengthValue: (value: string) => `${value} m`,
      generate: "モデル生成",
      generating: "生成中...",
      sendToAnalysis: "解析へ送る",
      error: "エラー",
      generationResult: "生成結果",
      resultNodeCount: "節点数",
      resultMemberCount: "部材数",
      resultSupportCount: "支点数",
      resultLoadCount: "荷重数",
      validationStatus: "検証ステータス",
      notAnalyzed: "未解析",
    },
    stepTitles: {
      1: "道路条件",
      2: "支間設定",
      3: "衝撃係数",
      4: "ライン設定 3D",
      5: "荷重設定",
      6: "FEMモデル生成",
    } as Record<number, string>,
  },

  viewer: {
    placeholderHint: "3Dビューはここに描画されます。",
    twoDFallbackNotice: "WebGL 初期化に失敗したため、2D簡易ビューを表示しています。",
    controlPanelTitle: "3D ビュー",
    animation: {
      toggleOn: "アニメ ON",
      toggleOff: "アニメ OFF",
      mode: "モード",
      displayScale: "表示倍率",
      playbackSpeed: "再生速度",
      direction: "方向",
      useDemoMode: "デモモードを使用",
    },
      controls: {
        ariaLabel: "表示操作",
        view: "View",
        viewFit: "モデル全体を表示",
        viewIso: "アイソメ表示",
        viewXy: "XY平面表示",
        viewYz: "YZ平面表示",
        viewXz: "XZ平面表示",
        compare: "Compare",
        compareView: "Compare View",
        cameraSync: "Camera Sync",
        animation: "Animation",
        animationLabel: "Animation",
        animationDemo: "Demo Shape",
        animationMode: "Mode",
        animationDirection: "Direction",
        animationDirectionX: "X (longitudinal)",
        animationDirectionZ: "Z (transverse)",
        animationDeformationScale: "Deformation Scale",
        animationSpeed: "Speed",
        coordinate: "Coordinate",
        spacerAxisSwap: "SPACER Axis Swap",
        analysisResults: "解析結果",
        loadCaseLabel: "荷重ケース",
        loadCaseAll: "すべて",
        eigenMode: "固有モード",
        responseDisplay: "応答表示",
        visibility: "表示要素",
        node: "節点",
        member: "部材",
        support: "支点",
        load: "荷重",
        label: "ラベル",
        grid: "グリッド",
        axis: "軸",
        nodeId: "節点ID",
        memberId: "部材ID",
        resultDiagrams: "結果図",
        deformedShape: "変形図",
        reaction: "反力図",
        axialForce: "軸力図",
        my: "My図",
        mz: "Mz図",
        scales: "倍率",
        loadScale: "荷重表示",
        deformationScale: "変形表示",
        modeScale: "Mode",
        resultScale: "結果図",
      },
    placeholder: {
      heading: "3D表示",
      selected: (label: string) => `選択中: ${label}`,
      loadCaseCount: (count: number) => `荷重ケース ${count}`,
      ariaLabel: "モデル概要",
    },
    messages: {
      webglInitFailed: "3D表示の初期化に失敗しました。",
        fallback2DSwitched: "2D簡易表示に切り替えました。",
        electronGpuHint: "Electron版では GPU_MODE=compat-gpu-blocklist または compat-angle-gl を試してください。",
        electronGpuLastResort: "legacy-desktop-gl は最後の手段です。",
        animationOn: "アニメ: ON",
        inputModelShown: "入力モデルを表示中",
        deformedShapeAvailable: "変形図を表示できます",
        unselected: "未選択",
        nodeCount: (count: number) => `節点 ${count}`,
        memberCount: (count: number) => `部材 ${count}`,
        supportCount: (count: number) => `支点 ${count}`,
        loadCount: (count: number) => `荷重 ${count}`,
        display: "表示",
        displayMode: (mode: string) => `表示: ${mode}`,
        nodeLabel: "節点",
        compareEmpty: "比較表示するビューがありません。",
        emptyNodesMembers: "表示できる節点・部材がありません。",
        memberLabel: "部材",
        fallback: "簡易",
      },
  },

  comparison: {
    decrease: (percent: string) => `${percent}%低減`,
    increase: (percent: string) => `${percent}%増加`,
    dash: "-",
    notComputed: "未計算",
    periodLabel: (order: number) => `${order}次周期`,
    horizontalModeLabel: "最大水平モード成分 (指標)",
    indicator: "指標",
    pierReactionLabel: "最大橋脚反力",
    notRun: "固有値解析を実行すると、周期およびモード変形指標を比較できます。",
    planShorter: "B案は1次周期が短くなる傾向があり、軟弱地盤側への変形集中が相対的に緩和される可能性があります。",
    planLonger: "B案は1次周期が長くなる傾向があり、軟弱地盤側への変形集中が相対的に大きくなる可能性があります。",
    planSimilar: "B案は1次周期がA案と同程度です。",
    planLessDeform: "B案ではA案に比べて最大水平モード成分が小さく、軟弱地盤側への変形集中が緩和される傾向があります。",
    planMoreDeform: "B案ではA案に比べて最大水平モード成分がやや大きく、軟弱地盤側への変形集中が増える可能性があります。",
    planSimilarDeform: "B案の最大水平モード成分はA案とほぼ同程度です。",
    planLessReaction: "最大橋脚反力はB案で小さくなり、支点設計上有利となる傾向があります。",
    planMoreReaction: "最大橋脚反力はB案で大きくなるため、支点・基礎の照査が必要です。",
  },
  comparisonPanel: {
    ariaLabel: "A案B案比較サマリー",
    heading: "比較サマリー",
    hint: "数値は解析実行後のみ表示されます。未取得の値は「-」または「未計算」と表示されます。",
    columns: {
      item: "項目",
      evaluation: "評価",
    },
    summary: {
      model: "モデル",
      nodeCount: "節点数",
      memberCount: "部材数",
      suspendedJunction: "掛け違い節点",
      spanCount: "支間数",
    },
  },
  timeHistoryWizard: {
    modalHeading: "時刻歴応答解析",
    modalAriaLabel: "時刻歴応答解析ウィザード",
    closeButton: "閉じる",
    openButton: "時刻歴応答解析を開く",
    descriptionText: "時刻歴応答解析では、地震波を入力して、構造物が時間とともにどのように揺れるかを確認します。詳細設定と結果確認は専用画面で行います。",
    status: {
      unconfigured: "未設定",
      incomplete: "入力不足",
      ready: "解析可能",
      running: "解析中",
      complete: "解析済み",
      error: "エラーあり",
    },
    sideNav: {
      intro: "はじめに",
      inputCheck: "入力チェック",
      groundMotion: "地震波設定",
      analysis: "解析条件設定",
      output: "出力対象選択",
      run: "解析実行",
      results: "結果表示",
    },
    intro: {
      heading: "はじめに",
      lead: "時刻歴応答解析は、地震波を時間ごとに入力し、構造物の変位・速度・加速度・断面力がどのように変化するかを確認する解析です。",
      stepsHeading: "操作は次の順番で進めます。",
      step1: "地震波を読み込む",
      step2: "解析条件を確認する",
      step3: "結果を見たい節点・部材を選ぶ",
      step4: "解析を実行する",
      step5: "グラフと最大値を確認する",
      help: "分からない項目は、まず初期値のままで進めてください。",
      collapseNextTime: "この説明を次回から折りたたむ",
    },
    inputCheck: {
      heading: "入力チェック",
      help: "赤く表示された項目を上から順に修正すると、解析を実行できる状態になります。",
      items: {
        model: "モデル定義",
        supports: "支点条件",
        mass: "質量設定",
        groundMotion: "地震波",
        unit: "地震波単位",
        dt: "時間刻み dt",
        duration: "解析時間",
        outputTarget: "出力対象",
        analysis: "解析条件",
        animation: "アニメーション表示に必要な変位成分",
      },
      states: {
        ok: "OK",
        ng: "NG",
        warning: "警告",
        unchecked: "未確認",
      },
      goToButton: (info: { section: string }) => info.section + "へ移動",
    },
    groundMotion: {
      heading: "地震波設定",
      stepImportLabel: "地震波ファイルを読み込む",
      stepImportHelp: "CSVまたは道路橋示方書形式の地震波を読み込めます。",
      importButton: "地震波を読み込む",
      selectLabel: "解析に使う地震波を選択",
      selectHelp: "複数の波形が含まれる場合は、解析に使う1つの波形を選んでください。",
      unitHeading: "単位確認",
      unitGal: "gal（cm/s²）",
      unitMeterPerSecondSquared: "m/s²",
      unitHelp: "gal は cm/s² を表す加速度の単位です。道路橋示方書の地震波では gal が使われることがあります。",
      cardHeading: "読み込んだ地震波",
      cardSampleCount: (info: { n: number }) => `データ点数: ${info.n} 点`,
      cardTimeStep: (info: { dt: number }) => `dt: ${info.dt.toFixed(4)} 秒`,
      cardDuration: (info: { d: number }) => `波形長: ${info.d.toFixed(2)} 秒`,
      cardCurrentDuration: (info: { d: number }) => `現在の解析時間: ${info.d.toFixed(2)} 秒`,
      cardExpectedSamples: (info: { n: number }) => `現在の解析設定で使う点数: ${info.n} 点`,
      cardMatchOk: "判定: 一致しています",
      cardMatchMismatch: "判定: 一致していません",
      mismatchTitle: "地震波データの点数と解析時間が一致していません",
      mismatchHelp: "読み込んだ地震波を最後まで使う場合は、解析時間を波形長に合わせてください。現在の解析時間を優先する場合は、解析時間を短くするか、別の地震波を選択してください。",
      matchDurationButton: "解析時間を地震波に合わせる",
      goToSectionButton: "地震波設定へ移動",
      durationFormula: "地震波を最後まで使う場合: 解析時間 = timeStep × (地震波点数 - 1)",
      previewHeading: "波形プレビュー",
    },
    analysis: {
      heading: "解析条件設定",
      help: "通常は初期値のままで解析できます。内容が分かる場合だけ変更してください。",
      detailsToggle: "詳細設定を表示",
      tooltipNewmark: "Newmark法は、時間を少しずつ進めながら構造物の揺れを計算する方法です。通常は初期値のままで問題ありません。",
      tooltipRayleigh: "Rayleigh減衰は、構造物の揺れが時間とともに小さくなる効果を表す設定です。分からない場合は初期値のままにしてください。",
      tooltipDt: "dtは地震波データの時間間隔です。例：0.01秒の場合、0.01秒ごとに地震の揺れを入力します。",
      tooltipDamping: "減衰は、揺れが自然に小さくなる性質です。一般的な初期値として 0.05 が使われます。",
      placeholderDt: "例 0.01",
      placeholderDuration: "例 40.96",
      placeholderDamping: "例 0.05",
      placeholderNewmarkBeta: "例 0.25",
      placeholderNewmarkGamma: "例 0.5",
    },
    output: {
      heading: "出力対象選択",
      nodeLabel: "変位・速度・加速度を見たい節点",
      nodeHelp: "迷う場合は、構造物の上部や揺れが大きそうな節点を選んでください。",
      memberLabel: "断面力を見たい部材",
      memberHelp: "迷う場合は、柱・主桁・支点付近など、重要な部材を選んでください。",
      suggestButton: "候補を表示",
      pickOnModelButton: "モデル上で選択",
      clearButton: "選択をクリア",
      outputComponentsHeading: "出力成分",
      ngMessage: "結果を表示する節点または部材が選択されていません。まずは変位を確認したい節点を1つ選んでください。",
    },
    run: {
      heading: "解析実行",
      summaryHeading: "実行前チェック",
      runButton: "この条件で時刻歴解析を実行",
      disabledMessage: "未修正の入力があります。赤く表示された項目を修正すると解析を実行できます。",
      runningMessage: "解析を実行しています。完了までしばらくお待ちください。",
      okGroup: "OK項目",
      warningGroup: "警告項目",
      ngGroup: "NG項目",
    },
    results: {
      heading: "結果表示",
      tabs: {
        overview: "概要",
        maxima: "最大値一覧",
        chart: "時刻歴グラフ",
        inputMotion: "地震波グラフ",
        animation: "アニメーション",
        detail: "詳細表",
        errors: "エラー／警告",
      },
      overview: {
        maxDisplacement: "最大変位",
        maxVelocity: "最大速度",
        maxAcceleration: "最大加速度",
        maxSectionForce: "最大断面力",
        timeOfMax: "発生時刻",
        targetNode: "対象節点",
        targetMember: "対象部材",
        groundMotion: "使用した地震波",
        analysisDuration: "解析時間",
        timeStep: "dt",
        helpMaxDisplacement: "最大変位は、解析中に構造物が最も大きく動いた量です。",
        helpTimeOfMax: "発生時刻は、その最大値が出た時刻です。",
        helpSign: "符号のプラス・マイナスは方向を表します。大きさを見る場合は絶対値を確認してください。",
      },
      maximaTable: {
        heading: "最大値一覧",
        kind: "種類",
        target: "対象",
        direction: "方向",
        max: "最大値",
        min: "最小値",
        absMax: "絶対最大値",
        timeOfMax: "発生時刻",
        unit: "単位",
      },
      errorTabHeading: "エラー／警告",
      errorTabEmpty: "エラーや警告はありません。",
    },
    animation: {
      availabilityHeading: "表示可能な結果",
      availabilityHelp: "XYZ合成変位を見るには、X方向・Y方向・Z方向の変位結果が必要です。出力対象または解析条件で3方向の変位を出力してください。",
      xStatus: "X方向変位",
      yStatus: "Y方向変位",
      zStatus: "Z方向変位",
      xyzStatus: "XYZ合成変位",
      okLabel: "OK",
      missingLabel: "未出力",
      availableLabel: "表示可能",
      unavailableLabel: "表示不可",
      xyzUnavailableTitle: "XYZ合成変位を表示できません",
      xyzUnavailableBody: "XYZ合成変位を表示するには、X方向・Y方向・Z方向すべての変位結果が必要です。",
      xyzUnavailableMissing: (info: { axes: string }) => `不足: ${info.axes}`,
      xyzUnavailableRemedy: "出力対象または解析条件で、X・Y・Z方向の変位を出力する設定にしてください。",
      goToOutputButton: "出力対象選択へ移動",
      heading: "アニメーション",
      play: "再生",
      pause: "一時停止",
      previous: "前へ",
      next: "次へ",
      reset: "リセット",
      speedLabel: "再生速度",
      speedOption: (multiplier: number) => `x${multiplier}`,
      displacementScaleLabel: "変形倍率",
      modeLabel: "変位モード",
      modeX: "X方向",
      modeY: "Y方向",
      modeZ: "Z方向",
      modeXyz: "XYZ合成",
      jumpToMax: "最大変位時刻へ",
      warningLargeScale: "変形倍率が大きすぎます。auto scale または小さな値を使用してください。",
      warningSampleMismatch: "サンプル数と時刻配列の長さが一致しません。短い方に合わせます。",
      warningNonFiniteValue: "非有限値が含まれるため 0 として扱います。",
      helpMode: "変位モードを切り替えると、選択した方向の変位のみが変形表示されます。",
      disabledNoResult: "解析結果がありません。",
      disabledNoDisplacement: "変位データがありません。",
      timeSliderLabel: (current: string, total: string) => `${current} / ${total}`,
      currentTimeLabel: (time: string, index: number, total: number) => `時刻 ${time} s (サンプル ${index + 1} / ${total})`,
      currentValueLabel: (value: string) => `現在値: ${value}`,
    
      columnResult: "結果",
      columnStatus: "状態",
      timeLabel: (info: { time: string; index: number; total: number }) => `時刻 ${info.time} 秒 / ステップ ${info.index + 1} / ${info.total}`,
      stepLabel: (info: { index: number; total: number }) => `ステップ ${info.index + 1} / ${info.total}`,
      valueLabel: (info: { value: string; time: string }) => `現在値 ${info.value} @ ${info.time} 秒`,
      maxAbsLabel: (info: { value: string; time: string }) => `絶対最大値 ${info.value} @ ${info.time} 秒`,
      scaleOption: (scale: number) => `x${scale}`,
      customScaleLabel: "個別指定",
      customScaleHelp: "変形倍率を個別に指定します。",
      embeddingHeading: "3D ビュー",
      embeddingHelp: "解析結果を使って、構造物の揺れを三次元で確認します。変位モードを切り替えると、X方向、Y方向、Z方向、XYZ合成の動きを確認できます。変形倍率は表示を見やすくするための倍率で、解析結果の値は変わりません。",
      playbackHeading: "再生操作",
      emptyResult: "解析結果がありません。Run ボタンで解析を実行してください。",
      placeholder: "3Dビューを準備中...",
      disabledViewer: "ビューを表示できません。解析結果が必要です。",},
    viewer: {
      heading: "3D ビュー",
      helperText: "解析結果を使って、構造物の揺れを三次元で確認します。変位モードを切り替えると、X方向、Y方向、Z方向、XYZ合成の動きを確認できます。変形倍率は表示を見やすくするための倍率で、解析結果の値は変わりません。",
      helpScale: "変形倍率は、揺れを見やすく拡大表示するための設定です。実際の変位値を変更するものではありません。",
      helpSpeed: "再生速度は、アニメーションの再生テンポだけを変更します。解析結果の時刻や値は変わりません。",
      helpMode: "変位モードを切り替えると、選択した方向の変位のみが変形表示されます。",
      timeLabel: (info: { time: string; index: number; total: number }) => `時刻: ${info.time} 秒 / ステップ ${info.index + 1} / ${info.total}`,
      emptyResult: "解析結果がありません。Run ボタンで解析を実行してください。",
      placeholder: "3Dビューを準備中...",
      currentScaleLabel: (scale: string) => `現在の変形倍率: ${scale}`,
      currentSpeedLabel: (speed: string) => `現在の再生速度: ${speed}`,
      currentModeLabel: (mode: string) => `現在の変位モード: ${mode}`,
      timeStepLabel: (info: { time: string; total: string }) => `dt: ${info.time} 秒 / 波形長: ${info.total} 秒`,
    },
    errors: {
      groundMotionMismatch: {
        title: "地震波データの点数と解析時間が一致していません",
        body: "読み込んだ地震波の点数と、現在の解析時間・時間刻みから計算される点数が一致していません。",
        currentSettings: "現在の設定",
        sampleCount: (info: { n: number }) => `地震波点数: ${info.n} 点`,
        requiredSamples: (info: { n: number }) => `現在の解析設定で必要な点数: ${info.n} 点`,
        timeStep: (info: { dt: number }) => `dt: ${info.dt.toFixed(4)} 秒`,
        duration: (info: { d: number }) => `現在の解析時間: ${info.d.toFixed(2)} 秒`,
        motionDuration: (info: { d: number }) => `地震波の長さ: ${info.d.toFixed(2)} 秒`,
        remedyHeading: "対応方法",
        remedyIntro: "次のどちらかを選んでください。",
        remedyOption1: (info: { duration: string }) => `地震波を最後まで使う場合、解析時間を ${info.duration} 秒 に変更してください。`,
        remedyOption2: "現在の解析時間を優先する場合、解析時間を短くするか、別の地震波を選択してください。",
        formula: "地震波を最後まで使う場合: 解析時間 = timeStep × (地震波点数 - 1)",
        matchDurationButton: "解析時間を地震波に合わせる",
        goToSectionButton: "地震波設定へ移動",
        detailLabel: "詳細",
      },
      groundMotionMissing: {
        title: "地震波が選択されていません",
        body: "時刻歴応答解析では、地震の揺れを表す地震波データが必要です。",
        remedy: "地震波設定でCSVまたは道路橋示方書形式の地震波を読み込んでください。",
        goToSectionButton: "地震波設定へ移動",
      },
      invalidDt: {
        title: "時間刻み dt が正しくありません",
        body: "dtは地震波データの時間間隔です。0より大きい値を入力してください。",
        example: "例: 0.01",
        goToSectionButton: "解析条件へ移動",
      },
      outputTargetMissing: {
        title: "結果を表示する対象が選択されていません",
        body: "結果を見るには、節点または部材を少なくとも1つ選ぶ必要があります。",
        remedy: "まずは変位を確認したい節点を1つ選んでください。",
        goToSectionButton: "出力対象選択へ移動",
      },
      animationIncomplete: {
        title: "XYZ合成変位を表示できません",
        body: "XYZ合成変位を表示するには、X方向・Y方向・Z方向すべての変位結果が必要です。",
        missingLabel: (info: { axes: string }) => `不足: ${info.axes}`,
        remedy: "出力対象または解析条件で、X・Y・Z方向の変位を出力する設定にしてください。",
        goToSectionButton: "出力対象選択へ移動",
      },
      detailLabel: "詳細",
    },
  },
};

export type JaDictionary = typeof ja;
