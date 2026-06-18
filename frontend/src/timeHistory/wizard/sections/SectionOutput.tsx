import type { ProjectModel } from "../../../types";

type SectionOutputProps = {
  project: ProjectModel;
};

export function SectionOutput({ project }: SectionOutputProps) {
  return (
    <section className="time-history-wizard-section">
      <h3>出力対象選択</h3>
      <p>解析結果を見たい節点・部材を確認します。迷う場合は、構造物の上部や揺れが大きそうな節点を選んでください。</p>
      <div className="time-history-output-grid">
        <article>
          <h4>変位・速度・加速度を見たい節点</h4>
          <p>現在のモデル節点数: {project.nodes.length}</p>
          <ul>
            {project.nodes.slice(0, 12).map((node) => (
              <li key={node.id}>{node.id}</li>
            ))}
          </ul>
        </article>
        <article>
          <h4>断面力を見たい部材</h4>
          <p>現在のモデル部材数: {project.members.length}</p>
          <ul>
            {project.members.slice(0, 12).map((member) => (
              <li key={member.id}>{member.id}</li>
            ))}
          </ul>
        </article>
      </div>
      <p className="time-history-help-text">現段階では解析エンジンがモデルの有効自由度に基づいて結果キーを返します。結果表示で出力されたキーを選択できます。</p>
    </section>
  );
}
