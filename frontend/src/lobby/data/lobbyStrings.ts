export const L0_STRINGS = {
  lobby: {
    title: "橋と建物の実験室",
    subtitle: "やりたいことを選んでください",
    footer: "※ いつでも他の編に切り替えできます",
    modes: {
      learn: {
        icon: "📚",
        name: "学習編",
        catch: "橋ってなんだろう",
        description: "動画や記事で橋のことを学べます",
        audience: "対象：はじめての方、お子さま、学生さん、発注者の方",
        button: "はじめる",
      },
      level0: {
        icon: "🌉",
        name: "入門編",
        catch: "サンプルで簡易計算",
        description: "用意された橋を地震でゆらしてみよう",
        audience: "対象：教育用途で触ってみたい方",
        button: "はじめる",
      },
      pro: {
        icon: "🏗",
        name: "実務編",
        catch: "実荷重で本格検討",
        description: "実際の荷重・条件で設計検討ができます",
        audience: "対象：設計実務者の方",
        button: "はじめる",
      },
    },
  },
  learnTop: {
    title: "📚 学習編",
    intro: "橋ってどんなものなんだろう？\n下のリンクから動画や記事を見てみよう。",
    backToLobby: "ホームに戻る",
    defaultModeLabel: "次回から学習編に直行する",
    externalNotice: "外部サイト（YouTube など）が新しいタブで開きます",
  },
  level0Header: {
    backToLobby: "ホームに戻る",
    defaultModeLabel: "次回から入門編に直行する",
    proModeButton: "実務編で開く",
  },
  proHeader: {
    backToLobby: "ホームに戻る",
    defaultModeLabel: "次回から実務編に直行する",
  },
} as const;
