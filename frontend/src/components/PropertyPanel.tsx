import { Plus, Trash2 } from "lucide-react";
import type {
  AnalysisSettings,
  LoadCase,
  Material,
  Member,
  MemberLoad,
  NodalLoad,
  NodeItem,
  ProjectInfo,
  ProjectModel,
  Section,
  SectionKey,
  Support,
} from "../types";

type PropertyPanelProps = {
  project: ProjectModel;
  selected: SectionKey;
  validationPaths: Set<string>;
  onChange: (project: ProjectModel) => void;
};

type FieldType = "text" | "number" | "boolean" | "static" | "linear_static" | "coord";
type Column<T> = {
  key: string;
  label: string;
  help?: string;
  type: FieldType;
  get: (item: T) => string | number | boolean;
  set: (item: T, value: string | number | boolean) => T;
};

export function PropertyPanel({
  project,
  selected,
  validationPaths,
  onChange,
}: PropertyPanelProps) {
  const update = <K extends keyof ProjectModel>(key: K, value: ProjectModel[K]) => {
    onChange({ ...project, [key]: value });
  };

  return (
    <aside className="property-panel" aria-label="プロパティ">
      <div className="panel-title">
        <h2>{titleFor(selected)}</h2>
        <p>{descriptionFor(selected)}</p>
      </div>
      {selected === "project" && (
        <ObjectEditor
          value={project.project}
          columns={projectColumns}
          pathPrefix="/project"
          validationPaths={validationPaths}
          onChange={(value) => update("project", value)}
        />
      )}
      {selected === "nodes" && (
        <ArrayEditor
          items={project.nodes}
          columns={nodeColumns}
          pathPrefix="/nodes"
          validationPaths={validationPaths}
          createItem={() => ({ id: nextId("N", project.nodes.length), x: 0, y: 0, z: 0 })}
          onChange={(items) => update("nodes", items)}
        />
      )}
      {selected === "members" && (
        <ArrayEditor
          items={project.members}
          columns={memberColumns}
          pathPrefix="/members"
          validationPaths={validationPaths}
          createItem={() => ({
            id: nextId("M", project.members.length),
            nodeI: project.nodes[0]?.id ?? "",
            nodeJ: project.nodes[1]?.id ?? project.nodes[0]?.id ?? "",
            materialId: project.materials[0]?.id ?? "",
            sectionId: project.sections[0]?.id ?? "",
            orientationVector: { x: 0, y: 0, z: 1 },
          })}
          onChange={(items) => update("members", items)}
        />
      )}
      {selected === "materials" && (
        <ArrayEditor
          items={project.materials}
          columns={materialColumns}
          pathPrefix="/materials"
          validationPaths={validationPaths}
          createItem={() => ({
            id: nextId("MAT", project.materials.length),
            name: "材料",
            elasticModulus: 200000000,
            shearModulus: 200000000 / (2 * (1 + 0.3)),
            poissonRatio: 0.3,
            density: 0,
          })}
          onChange={(items) => update("materials", items)}
        />
      )}
      {selected === "sections" && (
        <ArrayEditor
          items={project.sections}
          columns={sectionColumns}
          pathPrefix="/sections"
          validationPaths={validationPaths}
          createItem={() => ({
            id: nextId("SEC", project.sections.length),
            name: "断面",
            area: 0.01,
            iy: 0.00001,
            iz: 0.00001,
            j: 0.00001,
          })}
          onChange={(items) => update("sections", items)}
        />
      )}
      {selected === "supports" && (
        <ArrayEditor
          items={project.supports}
          columns={supportColumns}
          pathPrefix="/supports"
          validationPaths={validationPaths}
          createItem={() => ({
            nodeId: project.nodes[0]?.id ?? "",
            ux: true,
            uy: true,
            uz: true,
            rx: true,
            ry: true,
            rz: true,
          })}
          onChange={(items) => update("supports", items)}
        />
      )}
      {selected === "loadCases" && (
        <ArrayEditor
          items={project.loadCases}
          columns={loadCaseColumns}
          pathPrefix="/loadCases"
          validationPaths={validationPaths}
          createItem={(): LoadCase => ({
            id: nextId("LC", project.loadCases.length),
            name: "荷重ケース",
            type: "static",
          })}
          onChange={(items) => update("loadCases", items)}
        />
      )}
      {selected === "nodalLoads" && (
        <ArrayEditor
          items={project.nodalLoads}
          columns={nodalLoadColumns}
          pathPrefix="/nodalLoads"
          validationPaths={validationPaths}
          createItem={() => ({
            id: nextId("NL", project.nodalLoads.length),
            loadCaseId: project.loadCases[0]?.id ?? "",
            nodeId: project.nodes[0]?.id ?? "",
            fx: 0,
            fy: 0,
            fz: 0,
            mx: 0,
            my: 0,
            mz: 0,
          })}
          onChange={(items) => update("nodalLoads", items)}
        />
      )}
      {selected === "memberLoads" && (
        <ArrayEditor
          items={project.memberLoads}
          columns={memberLoadColumns}
          pathPrefix="/memberLoads"
          validationPaths={validationPaths}
          createItem={(): MemberLoad => ({
            id: nextId("ML", project.memberLoads.length),
            loadCaseId: project.loadCases[0]?.id ?? "",
            memberId: project.members[0]?.id ?? "",
            coordinateSystem: "local",
            type: "uniform",
            wx: 0,
            wy: 0,
            wz: 0,
          })}
          onChange={(items) => update("memberLoads", items)}
        />
      )}
      {selected === "analysisSettings" && (
        <ObjectEditor
          value={project.analysisSettings}
          columns={analysisColumns}
          pathPrefix="/analysisSettings"
          validationPaths={validationPaths}
          onChange={(value) => update("analysisSettings", value)}
        />
      )}
      {selected === "results" && (
        <div className="empty-state">解析を実行すると、下部の解析結果パネルに結果が表示されます。</div>
      )}
    </aside>
  );
}

function ObjectEditor<T>({
  value,
  columns,
  pathPrefix,
  validationPaths,
  onChange,
}: {
  value: T;
  columns: Column<T>[];
  pathPrefix: string;
  validationPaths: Set<string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="field-stack">
      {columns.map((column) => (
        <label
          key={column.key}
          className={validationPaths.has(`${pathPrefix}/${column.key}`) ? "field invalid" : "field"}
        >
          <span title={column.help}>{column.label}</span>
          <FieldInput
            column={column}
            value={column.get(value)}
            onChange={(nextValue) => onChange(column.set(value, nextValue))}
          />
        </label>
      ))}
    </div>
  );
}

function ArrayEditor<T>({
  items,
  columns,
  pathPrefix,
  validationPaths,
  createItem,
  onChange,
}: {
  items: T[];
  columns: Column<T>[];
  pathPrefix: string;
  validationPaths: Set<string>;
  createItem: () => T;
  onChange: (items: T[]) => void;
}) {
  const setCell = (rowIndex: number, column: Column<T>, value: string | number | boolean) => {
    onChange(items.map((item, index) => (index === rowIndex ? column.set(item, value) : item)));
  };

  return (
    <div className="table-wrap">
      <button className="add-row" type="button" onClick={() => onChange([...items, createItem()])}>
        <Plus size={16} />
        行を追加
      </button>
      <table className="edit-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th aria-label="操作" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    validationPaths.has(`${pathPrefix}/${rowIndex}/${column.key}`)
                      ? "invalid-cell"
                      : undefined
                  }
                >
                  <FieldInput
                    column={column}
                    value={column.get(item)}
                    onChange={(value) => setCell(rowIndex, column, value)}
                  />
                </td>
              ))}
              <td>
                <button
                  className="icon-button"
                  type="button"
                  title="行を削除"
                  onClick={() => onChange(items.filter((_, index) => index !== rowIndex))}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <div className="empty-state">行がありません。</div>}
    </div>
  );
}

function FieldInput<T>({
  column,
  value,
  onChange,
}: {
  column: Column<T>;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  if (column.type === "boolean") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }
  if (column.type === "static" || column.type === "linear_static") {
    return <input type="text" value={displayReadOnlyValue(String(value))} readOnly />;
  }
  if (column.type === "coord") {
    return (
      <select value={String(value)} onChange={(event) => onChange(event.currentTarget.value)}>
        <option value="local">部材ローカル座標</option>
        <option value="global">全体座標</option>
      </select>
    );
  }
  if (column.type === "number") {
    return (
      <input
        type="number"
        step="any"
        value={String(value)}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value)}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function titleFor(section: SectionKey): string {
  const titles: Record<SectionKey, string> = {
    project: "プロジェクト",
    nodes: "節点",
    members: "部材",
    materials: "材料",
    sections: "断面",
    supports: "支点条件",
    loadCases: "荷重ケース",
    nodalLoads: "節点荷重",
    memberLoads: "部材荷重",
    analysisSettings: "解析設定",
    results: "解析結果",
  };
  return titles[section];
}

function displayReadOnlyValue(value: string): string {
  const labels: Record<string, string> = {
    static: "静的",
    uniform: "等分布",
    linear_static: "線形静的解析",
  };
  return labels[value] ?? value;
}

function descriptionFor(section: SectionKey): string {
  const descriptions: Record<SectionKey, string> = {
    project: "プロジェクト名や説明など、保存ファイル全体の基本情報です。",
    nodes: "節点は骨組みの接続点です。座標X/Y/Zをm単位で入力します。",
    members: "部材は2つの節点をつなぐ梁要素です。材料IDと断面IDを指定します。",
    materials: "材料はヤング係数E、せん断弾性係数G、ポアソン比などを設定します。",
    sections: "断面は断面積A、断面二次モーメントIy/Iz、ねじり定数Jを設定します。",
    supports: "支点条件は固定・ピンなどの拘束条件を6自由度で指定します。チェックありは拘束を表します。",
    loadCases: "荷重ケースは死荷重、活荷重など、荷重のまとまりです。MVPでは静的荷重のみ扱います。",
    nodalLoads: "節点荷重は節点に直接作用する力やモーメントです。力はkN、モーメントはkN_mです。",
    memberLoads: "部材荷重は部材に沿って作用する等分布荷重です。荷重強度はkN/mです。",
    analysisSettings: "解析実行の設定です。MVPでは線形静的解析を対象にします。",
    results: "解析実行後の変位、反力、部材端力を確認します。",
  };
  return descriptions[section];
}

function nextId(prefix: string, length: number): string {
  return `${prefix}${length + 1}`;
}

const projectColumns: Column<ProjectInfo>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "プロジェクト名", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "schemaVersion", label: "スキーマ", type: "static", get: (x) => x.schemaVersion, set: (x) => x },
  { key: "description", label: "説明", type: "text", get: (x) => x.description, set: (x, v) => ({ ...x, description: String(v) }) },
  { key: "createdAt", label: "作成日時", type: "text", get: (x) => x.createdAt, set: (x, v) => ({ ...x, createdAt: String(v) }) },
  { key: "updatedAt", label: "更新日時", type: "text", get: (x) => x.updatedAt, set: (x, v) => ({ ...x, updatedAt: String(v) }) },
];

const nodeColumns: Column<NodeItem>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "x", label: "X座標 [m]", type: "number", get: (x) => x.x, set: (x, v) => ({ ...x, x: Number(v) }) },
  { key: "y", label: "Y座標 [m]", type: "number", get: (x) => x.y, set: (x, v) => ({ ...x, y: Number(v) }) },
  { key: "z", label: "Z座標 [m]", type: "number", get: (x) => x.z, set: (x, v) => ({ ...x, z: Number(v) }) },
  { key: "label", label: "表示名", type: "text", get: (x) => x.label ?? "", set: (x, v) => ({ ...x, label: String(v) }) },
];

const memberColumns: Column<Member>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "nodeI", label: "始点節点 nodeI", type: "text", get: (x) => x.nodeI, set: (x, v) => ({ ...x, nodeI: String(v) }) },
  { key: "nodeJ", label: "終点節点 nodeJ", type: "text", get: (x) => x.nodeJ, set: (x, v) => ({ ...x, nodeJ: String(v) }) },
  { key: "materialId", label: "材料ID", type: "text", get: (x) => x.materialId, set: (x, v) => ({ ...x, materialId: String(v) }) },
  { key: "sectionId", label: "断面ID", type: "text", get: (x) => x.sectionId, set: (x, v) => ({ ...x, sectionId: String(v) }) },
  { key: "orientationVector", label: "向きベクトルY", type: "number", help: "部材の局所軸の向きを決める補助値です。", get: (x) => x.orientationVector?.y ?? 0, set: (x, v) => ({ ...x, orientationVector: { x: x.orientationVector?.x ?? 0, y: Number(v), z: x.orientationVector?.z ?? 1 } }) },
];

const materialColumns: Column<Material>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "材料名", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "elasticModulus", label: "ヤング係数 E", type: "number", help: "単位は kN/m2 です。", get: (x) => x.elasticModulus, set: (x, v) => ({ ...x, elasticModulus: Number(v) }) },
  { key: "shearModulus", label: "せん断弾性係数 G", type: "number", help: "単位は kN/m2 です。", get: (x) => x.shearModulus, set: (x, v) => ({ ...x, shearModulus: Number(v) }) },
  { key: "poissonRatio", label: "ポアソン比 ν", type: "number", get: (x) => x.poissonRatio, set: (x, v) => ({ ...x, poissonRatio: Number(v) }) },
  { key: "density", label: "密度", type: "number", get: (x) => x.density, set: (x, v) => ({ ...x, density: Number(v) }) },
];

const sectionColumns: Column<Section>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "断面名", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "area", label: "断面積 A", type: "number", help: "単位は m2 です。", get: (x) => x.area, set: (x, v) => ({ ...x, area: Number(v) }) },
  { key: "iy", label: "断面二次モーメント Iy", type: "number", help: "単位は m4 です。", get: (x) => x.iy, set: (x, v) => ({ ...x, iy: Number(v) }) },
  { key: "iz", label: "断面二次モーメント Iz", type: "number", help: "単位は m4 です。", get: (x) => x.iz, set: (x, v) => ({ ...x, iz: Number(v) }) },
  { key: "j", label: "ねじり定数 J", type: "number", help: "単位は m4 です。", get: (x) => x.j, set: (x, v) => ({ ...x, j: Number(v) }) },
];

const supportColumns: Column<Support>[] = [
  { key: "nodeId", label: "節点ID", type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "ux", label: "X方向変位 UX", type: "boolean", get: (x) => x.ux, set: (x, v) => ({ ...x, ux: Boolean(v) }) },
  { key: "uy", label: "Y方向変位 UY", type: "boolean", get: (x) => x.uy, set: (x, v) => ({ ...x, uy: Boolean(v) }) },
  { key: "uz", label: "Z方向変位 UZ", type: "boolean", get: (x) => x.uz, set: (x, v) => ({ ...x, uz: Boolean(v) }) },
  { key: "rx", label: "X軸回り回転 RX", type: "boolean", get: (x) => x.rx, set: (x, v) => ({ ...x, rx: Boolean(v) }) },
  { key: "ry", label: "Y軸回り回転 RY", type: "boolean", get: (x) => x.ry, set: (x, v) => ({ ...x, ry: Boolean(v) }) },
  { key: "rz", label: "Z軸回り回転 RZ", type: "boolean", get: (x) => x.rz, set: (x, v) => ({ ...x, rz: Boolean(v) }) },
];

const loadCaseColumns: Column<LoadCase>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "荷重ケース名", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "type", label: "種類", type: "static", get: (x) => x.type, set: (x) => x },
];

const nodalLoadColumns: Column<NodalLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: "荷重ケースID", type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "nodeId", label: "節点ID", type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "fx", label: "X方向力 Fx", type: "number", help: "単位は kN です。", get: (x) => x.fx, set: (x, v) => ({ ...x, fx: Number(v) }) },
  { key: "fy", label: "Y方向力 Fy", type: "number", help: "単位は kN です。", get: (x) => x.fy, set: (x, v) => ({ ...x, fy: Number(v) }) },
  { key: "fz", label: "Z方向力 Fz", type: "number", help: "単位は kN です。", get: (x) => x.fz, set: (x, v) => ({ ...x, fz: Number(v) }) },
  { key: "mx", label: "X軸回りモーメント Mx", type: "number", help: "単位は kN_m です。", get: (x) => x.mx, set: (x, v) => ({ ...x, mx: Number(v) }) },
  { key: "my", label: "Y軸回りモーメント My", type: "number", help: "単位は kN_m です。", get: (x) => x.my, set: (x, v) => ({ ...x, my: Number(v) }) },
  { key: "mz", label: "Z軸回りモーメント Mz", type: "number", help: "単位は kN_m です。", get: (x) => x.mz, set: (x, v) => ({ ...x, mz: Number(v) }) },
];

const memberLoadColumns: Column<MemberLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: "荷重ケースID", type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "memberId", label: "部材ID", type: "text", get: (x) => x.memberId, set: (x, v) => ({ ...x, memberId: String(v) }) },
  { key: "coordinateSystem", label: "座標系", type: "coord", get: (x) => x.coordinateSystem, set: (x, v) => ({ ...x, coordinateSystem: String(v) === "global" ? "global" : "local" }) },
  { key: "type", label: "種類", type: "static", get: (x) => x.type, set: (x) => x },
  { key: "wx", label: "部材分布荷重 wx", type: "number", help: "単位は kN/m です。", get: (x) => x.wx, set: (x, v) => ({ ...x, wx: Number(v) }) },
  { key: "wy", label: "部材分布荷重 wy", type: "number", help: "単位は kN/m です。", get: (x) => x.wy, set: (x, v) => ({ ...x, wy: Number(v) }) },
  { key: "wz", label: "部材分布荷重 wz", type: "number", help: "単位は kN/m です。", get: (x) => x.wz, set: (x, v) => ({ ...x, wz: Number(v) }) },
];

const analysisColumns: Column<AnalysisSettings>[] = [
  { key: "analysisType", label: "解析種類", type: "linear_static", get: (x) => x.analysisType, set: (x) => x },
  { key: "includeShearDeformation", label: "せん断変形", type: "boolean", help: "MVPでは変更できません。", get: (x) => x.includeShearDeformation, set: (x) => x },
  { key: "largeDisplacement", label: "大変位解析", type: "boolean", help: "MVPでは変更できません。", get: (x) => x.largeDisplacement, set: (x) => x },
  { key: "tolerance", label: "収束許容値", type: "number", get: (x) => x.tolerance, set: (x, v) => ({ ...x, tolerance: Number(v) }) },
];
