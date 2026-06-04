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
    <aside className="property-panel" aria-label="Property panel">
      <div className="panel-title">
        <h2>{titleFor(selected)}</h2>
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
            name: "Material",
            elasticModulus: 200000000,
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
            name: "Section",
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
            name: "Load Case",
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
        <div className="empty-state">Run analysis to populate the results panel.</div>
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
          <span>{column.label}</span>
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
        Add row
      </button>
      <table className="edit-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th aria-label="Actions" />
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
                  title="Delete row"
                  onClick={() => onChange(items.filter((_, index) => index !== rowIndex))}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <div className="empty-state">No rows.</div>}
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
    return <input type="text" value={String(value)} readOnly />;
  }
  if (column.type === "coord") {
    return (
      <select value={String(value)} onChange={(event) => onChange(event.currentTarget.value)}>
        <option value="local">local</option>
        <option value="global">global</option>
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
    project: "Project",
    nodes: "Nodes",
    members: "Members",
    materials: "Materials",
    sections: "Sections",
    supports: "Supports",
    loadCases: "Load Cases",
    nodalLoads: "Nodal Loads",
    memberLoads: "Member Loads",
    analysisSettings: "Analysis Settings",
    results: "Results",
  };
  return titles[section];
}

function nextId(prefix: string, length: number): string {
  return `${prefix}${length + 1}`;
}

const projectColumns: Column<ProjectInfo>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "Name", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "schemaVersion", label: "Schema", type: "static", get: (x) => x.schemaVersion, set: (x) => x },
  { key: "description", label: "Description", type: "text", get: (x) => x.description, set: (x, v) => ({ ...x, description: String(v) }) },
  { key: "createdAt", label: "Created", type: "text", get: (x) => x.createdAt, set: (x, v) => ({ ...x, createdAt: String(v) }) },
  { key: "updatedAt", label: "Updated", type: "text", get: (x) => x.updatedAt, set: (x, v) => ({ ...x, updatedAt: String(v) }) },
];

const nodeColumns: Column<NodeItem>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "x", label: "X", type: "number", get: (x) => x.x, set: (x, v) => ({ ...x, x: Number(v) }) },
  { key: "y", label: "Y", type: "number", get: (x) => x.y, set: (x, v) => ({ ...x, y: Number(v) }) },
  { key: "z", label: "Z", type: "number", get: (x) => x.z, set: (x, v) => ({ ...x, z: Number(v) }) },
  { key: "label", label: "Label", type: "text", get: (x) => x.label ?? "", set: (x, v) => ({ ...x, label: String(v) }) },
];

const memberColumns: Column<Member>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "nodeI", label: "Node I", type: "text", get: (x) => x.nodeI, set: (x, v) => ({ ...x, nodeI: String(v) }) },
  { key: "nodeJ", label: "Node J", type: "text", get: (x) => x.nodeJ, set: (x, v) => ({ ...x, nodeJ: String(v) }) },
  { key: "materialId", label: "Material", type: "text", get: (x) => x.materialId, set: (x, v) => ({ ...x, materialId: String(v) }) },
  { key: "sectionId", label: "Section", type: "text", get: (x) => x.sectionId, set: (x, v) => ({ ...x, sectionId: String(v) }) },
  { key: "orientationVector", label: "Orient Y", type: "number", get: (x) => x.orientationVector?.y ?? 0, set: (x, v) => ({ ...x, orientationVector: { x: x.orientationVector?.x ?? 0, y: Number(v), z: x.orientationVector?.z ?? 1 } }) },
];

const materialColumns: Column<Material>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "Name", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "elasticModulus", label: "E", type: "number", get: (x) => x.elasticModulus, set: (x, v) => ({ ...x, elasticModulus: Number(v) }) },
  { key: "poissonRatio", label: "Poisson", type: "number", get: (x) => x.poissonRatio, set: (x, v) => ({ ...x, poissonRatio: Number(v) }) },
  { key: "density", label: "Density", type: "number", get: (x) => x.density, set: (x, v) => ({ ...x, density: Number(v) }) },
];

const sectionColumns: Column<Section>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "Name", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "area", label: "Area", type: "number", get: (x) => x.area, set: (x, v) => ({ ...x, area: Number(v) }) },
  { key: "iy", label: "Iy", type: "number", get: (x) => x.iy, set: (x, v) => ({ ...x, iy: Number(v) }) },
  { key: "iz", label: "Iz", type: "number", get: (x) => x.iz, set: (x, v) => ({ ...x, iz: Number(v) }) },
  { key: "j", label: "J", type: "number", get: (x) => x.j, set: (x, v) => ({ ...x, j: Number(v) }) },
];

const supportColumns: Column<Support>[] = [
  { key: "nodeId", label: "Node", type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "ux", label: "Ux", type: "boolean", get: (x) => x.ux, set: (x, v) => ({ ...x, ux: Boolean(v) }) },
  { key: "uy", label: "Uy", type: "boolean", get: (x) => x.uy, set: (x, v) => ({ ...x, uy: Boolean(v) }) },
  { key: "uz", label: "Uz", type: "boolean", get: (x) => x.uz, set: (x, v) => ({ ...x, uz: Boolean(v) }) },
  { key: "rx", label: "Rx", type: "boolean", get: (x) => x.rx, set: (x, v) => ({ ...x, rx: Boolean(v) }) },
  { key: "ry", label: "Ry", type: "boolean", get: (x) => x.ry, set: (x, v) => ({ ...x, ry: Boolean(v) }) },
  { key: "rz", label: "Rz", type: "boolean", get: (x) => x.rz, set: (x, v) => ({ ...x, rz: Boolean(v) }) },
];

const loadCaseColumns: Column<LoadCase>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: "Name", type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "type", label: "Type", type: "static", get: (x) => x.type, set: (x) => x },
];

const nodalLoadColumns: Column<NodalLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: "Case", type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "nodeId", label: "Node", type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "fx", label: "Fx", type: "number", get: (x) => x.fx, set: (x, v) => ({ ...x, fx: Number(v) }) },
  { key: "fy", label: "Fy", type: "number", get: (x) => x.fy, set: (x, v) => ({ ...x, fy: Number(v) }) },
  { key: "fz", label: "Fz", type: "number", get: (x) => x.fz, set: (x, v) => ({ ...x, fz: Number(v) }) },
  { key: "mx", label: "Mx", type: "number", get: (x) => x.mx, set: (x, v) => ({ ...x, mx: Number(v) }) },
  { key: "my", label: "My", type: "number", get: (x) => x.my, set: (x, v) => ({ ...x, my: Number(v) }) },
  { key: "mz", label: "Mz", type: "number", get: (x) => x.mz, set: (x, v) => ({ ...x, mz: Number(v) }) },
];

const memberLoadColumns: Column<MemberLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: "Case", type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "memberId", label: "Member", type: "text", get: (x) => x.memberId, set: (x, v) => ({ ...x, memberId: String(v) }) },
  { key: "coordinateSystem", label: "Coord", type: "coord", get: (x) => x.coordinateSystem, set: (x, v) => ({ ...x, coordinateSystem: String(v) === "global" ? "global" : "local" }) },
  { key: "type", label: "Type", type: "static", get: (x) => x.type, set: (x) => x },
  { key: "wx", label: "Wx", type: "number", get: (x) => x.wx, set: (x, v) => ({ ...x, wx: Number(v) }) },
  { key: "wy", label: "Wy", type: "number", get: (x) => x.wy, set: (x, v) => ({ ...x, wy: Number(v) }) },
  { key: "wz", label: "Wz", type: "number", get: (x) => x.wz, set: (x, v) => ({ ...x, wz: Number(v) }) },
];

const analysisColumns: Column<AnalysisSettings>[] = [
  { key: "analysisType", label: "Type", type: "linear_static", get: (x) => x.analysisType, set: (x) => x },
  { key: "includeShearDeformation", label: "Shear", type: "boolean", get: (x) => x.includeShearDeformation, set: (x) => x },
  { key: "largeDisplacement", label: "Large disp.", type: "boolean", get: (x) => x.largeDisplacement, set: (x) => x },
  { key: "tolerance", label: "Tolerance", type: "number", get: (x) => x.tolerance, set: (x, v) => ({ ...x, tolerance: Number(v) }) },
];
