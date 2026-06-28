import { Plus, Trash2 } from "lucide-react";
import { ja } from "../i18n/ja";
import type {
  AnalysisSettings,
  LoadCase,
  MassItem,
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

const DEFAULT_RESPONSE_SPECTRUM_SETTINGS: NonNullable<
  AnalysisSettings["responseSpectrum"]
> = {
  massCaseId: "",
  modeCount: 3,
  spectrumCaseId: "spec-1",
  direction: "X",
  dampingRatio: 0.05,
  targetCumulativeMassRatio: 0.9,
  spectrumPoints: [
    { period: 0, value: 1 },
    { period: 0.1, value: 1 },
    { period: 1, value: 1 },
  ],
};

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
    <aside className="property-panel" aria-label={ja.propertyPanel.panelAriaLabel}>
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
            name: ja.defaults.newMaterialName,
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
            name: ja.defaults.newSectionName,
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
            name: ja.defaults.newLoadCaseName,
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
      {selected === "massCases" && (
        <MassCaseEditor
          project={project}
          validationPaths={validationPaths}
          onChange={(massCases) => update("massCases", massCases)}
        />
      )}
      {selected === "analysisSettings" && (
        <>
          <ObjectEditor
            value={project.analysisSettings}
            columns={analysisColumns}
            pathPrefix="/analysisSettings"
            validationPaths={validationPaths}
            onChange={(value) => update("analysisSettings", value)}
          />
          <ResponseSpectrumEditor
            project={project}
            validationPaths={validationPaths}
            onChange={(analysisSettings) => update("analysisSettings", analysisSettings)}
          />
        </>
      )}
      {selected === "results" && (
        <div className="empty-state">{ja.propertyPanel.runResultsHint}</div>
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
  minimumItems = 0,
  onChange,
}: {
  items: T[];
  columns: Column<T>[];
  pathPrefix: string;
  validationPaths: Set<string>;
  createItem: () => T;
  minimumItems?: number;
  onChange: (items: T[]) => void;
}) {
  const setCell = (rowIndex: number, column: Column<T>, value: string | number | boolean) => {
    onChange(items.map((item, index) => (index === rowIndex ? column.set(item, value) : item)));
  };

  return (
    <div className="table-wrap">
      <button className="add-row" type="button" onClick={() => onChange([...items, createItem()])}>
        <Plus size={16} />
        {ja.propertyPanel.rowAdd}
      </button>
      <table className={`edit-table edit-table-${tableClassName(pathPrefix)}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th aria-label={ja.propertyPanel.actionAriaLabel} />
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
                  title={ja.propertyPanel.rowDeleteTitle}
                  disabled={items.length <= minimumItems}
                  onClick={() => onChange(items.filter((_, index) => index !== rowIndex))}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <div className="empty-state">{ja.propertyPanel.rowEmpty}</div>}
    </div>
  );
}

function MassCaseEditor({
  project,
  validationPaths,
  onChange,
}: {
  project: ProjectModel;
  validationPaths: Set<string>;
  onChange: (massCases: ProjectModel["massCases"]) => void;
}) {
  const massCase = project.massCases?.[0] ?? {
    id: "mass-1",
    name: "Eigen Mass",
    method: "lumped" as const,
    source: "manual" as const,
    items: [],
  };
  const updateItems = (items: MassItem[]) => {
    onChange([{ ...massCase, items }]);
  };
  return (
    <div className="field-stack">
      <ObjectEditor
        value={massCase}
        columns={massCaseColumns}
        pathPrefix="/massCases/0"
        validationPaths={validationPaths}
        onChange={(value) => onChange([{ ...value, items: massCase.items }])}
      />
      <ArrayEditor
        items={massCase.items}
        columns={massItemColumns}
        pathPrefix="/massCases/0/items"
        validationPaths={validationPaths}
        createItem={() => ({
          nodeId: project.nodes[0]?.id ?? "",
          mx: 1,
          my: 1,
          mz: 1,
          irx: 0,
          iry: 0,
          irz: 0,
        })}
        onChange={updateItems}
      />
    </div>
  );
}

function ResponseSpectrumEditor({
  project,
  validationPaths,
  onChange,
}: {
  project: ProjectModel;
  validationPaths: Set<string>;
  onChange: (analysisSettings: AnalysisSettings) => void;
}) {
  const massCases = project.massCases ?? [];
  const settings = {
    ...DEFAULT_RESPONSE_SPECTRUM_SETTINGS,
    massCaseId:
      project.analysisSettings.responseSpectrum?.massCaseId ??
      project.analysisSettings.eigen?.massCaseId ??
      massCases[0]?.id ??
      "",
    ...project.analysisSettings.responseSpectrum,
    spectrumPoints:
      project.analysisSettings.responseSpectrum?.spectrumPoints ??
      DEFAULT_RESPONSE_SPECTRUM_SETTINGS.spectrumPoints,
  };
  const updateSettings = (
    next: Partial<NonNullable<AnalysisSettings["responseSpectrum"]>>,
  ) => {
    onChange({
      ...project.analysisSettings,
      responseSpectrum: {
        ...settings,
        ...next,
      },
    });
  };

  return (
    <section className="field-stack response-spectrum-settings">
      <h3>{ja.propertyPanel.responseSpectrumHeading}</h3>
      <label
        className={
          validationPaths.has("/analysisSettings/responseSpectrum/massCaseId")
            ? "field invalid"
            : "field"
        }
      >
        <span>{ja.propertyPanel.massCaseLabel}</span>
        <select
          aria-label={ja.propertyPanel.massCaseAriaLabel}
          value={settings.massCaseId}
          disabled={massCases.length === 0}
          onChange={(event) => updateSettings({ massCaseId: event.currentTarget.value })}
        >
          {massCases.length === 0 && <option value="">{ja.propertyPanel.massCaseEmpty}</option>}
          {massCases.map((massCase) => (
            <option key={massCase.id} value={massCase.id}>
              {massCase.name} ({massCase.id})
            </option>
          ))}
        </select>
      </label>
      {massCases.length === 0 && (
        <p className="empty-state">{ja.propertyPanel.emptyState}</p>
      )}
      <label className="field">
        <span>{ja.propertyPanel.modeCountLabel}</span>
        <input
          aria-label={ja.propertyPanel.modeCountAriaLabel}
          type="number"
          min="1"
          step="1"
          value={settings.modeCount}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isInteger(value) && value >= 1) updateSettings({ modeCount: value });
          }}
        />
      </label>
      <label className="field">
        <span>{ja.propertyPanel.directionLabel}</span>
        <select
          aria-label={ja.propertyPanel.directionAriaLabel}
          value={settings.direction}
          onChange={(event) =>
            updateSettings({ direction: event.currentTarget.value as "X" | "Y" | "Z" })
          }
        >
          <option value="X">X</option>
          <option value="Y">Y</option>
          <option value="Z">Z</option>
        </select>
      </label>
      <label className="field">
        <span>{ja.propertyPanel.dampingRatioLabel}</span>
        <input
          aria-label={ja.propertyPanel.dampingRatioAriaLabel}
          type="number"
          min="0"
          step="any"
          value={settings.dampingRatio}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isFinite(value) && value >= 0) updateSettings({ dampingRatio: value });
          }}
        />
      </label>
      <label className="field">
        <span>{ja.propertyPanel.targetCumulativeMassRatioLabel}</span>
        <input
          aria-label={ja.propertyPanel.targetCumulativeMassRatioAriaLabel}
          type="number"
          min="0"
          max="1"
          step="any"
          value={settings.targetCumulativeMassRatio}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isFinite(value) && value > 0 && value <= 1) {
              updateSettings({ targetCumulativeMassRatio: value });
            }
          }}
        />
      </label>
      <label className="field">
        <span>{ja.propertyPanel.combinationMethodLabel}</span>
        <select
          aria-label={ja.propertyPanel.combinationMethodAriaLabel}
          value={settings.combinationMethod ?? "SRSS"}
          onChange={(event) =>
            updateSettings({
              combinationMethod: event.currentTarget.value as "SRSS" | "CQC",
            })
          }
        >
          <option value="SRSS">{ja.propertyPanel.combinationMethodSRSS}</option>
          <option value="CQC">{ja.propertyPanel.combinationMethodCQC}</option>
        </select>
      </label>
      <label className="field">
        <span>{ja.propertyPanel.interpolationLabel}</span>
        <select
          aria-label={ja.propertyPanel.interpolationAriaLabel}
          value={settings.interpolationMethod ?? "linear"}
          onChange={(event) =>
            updateSettings({
              interpolationMethod: event.currentTarget.value as "linear" | "logLog",
            })
          }
        >
          <option value="linear">{ja.propertyPanel.interpolationLinear}</option>
          <option value="logLog">{ja.propertyPanel.interpolationLogLog}</option>
        </select>
      </label>
      <label className="field">
        <span>{ja.propertyPanel.spectrumCaseIdLabel}</span>
        <input
          aria-label={ja.propertyPanel.spectrumCaseIdAriaLabel}
          type="text"
          value={settings.spectrumCaseId}
          onChange={(event) => updateSettings({ spectrumCaseId: event.currentTarget.value })}
        />
      </label>
      <div>
        <h3>{ja.propertyPanel.spectrumPointsHeading}</h3>
        <ArrayEditor
          items={settings.spectrumPoints}
          columns={spectrumPointColumns}
          pathPrefix="/analysisSettings/responseSpectrum/spectrumPoints"
          validationPaths={validationPaths}
          minimumItems={2}
          createItem={() => {
            const last = settings.spectrumPoints.at(-1);
            return {
              period: last ? last.period + 0.1 : 0,
              value: last?.value ?? 0,
            };
          }}
          onChange={(spectrumPoints) => updateSettings({ spectrumPoints })}
        />
      </div>
    </section>
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
        <option value="local">{ja.propertyPanel.coordinatesSystemLocal}</option>
        <option value="global">{ja.propertyPanel.coordinatesSystemGlobal}</option>
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
  return ja.propertyPanel.sectionTitles[section];
}

function displayReadOnlyValue(value: string): string {
  const labels: Record<string, string> = {
    static: ja.propertyPanel.loadTypeStatic,
    uniform: ja.propertyPanel.loadTypeUniform,
    linear_static: ja.propertyPanel.analysisTypeLinearStatic,
  };
  return labels[value] ?? value;
}

function descriptionFor(section: SectionKey): string {
  return ja.propertyPanel.descriptions[section];
}

function nextId(prefix: string, length: number): string {
  return `${prefix}${length + 1}`;
}

function tableClassName(pathPrefix: string): string {
  return pathPrefix.replaceAll("/", "-").replace(/^-/, "") || "root";
}

const projectColumns: Column<ProjectInfo>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: ja.propertyPanel.columns.projectName, type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "schemaVersion", label: ja.propertyPanel.columns.schemaVersion, type: "static", get: (x) => x.schemaVersion, set: (x) => x },
  { key: "description", label: ja.propertyPanel.columns.description, type: "text", get: (x) => x.description, set: (x, v) => ({ ...x, description: String(v) }) },
  { key: "createdAt", label: ja.propertyPanel.columns.createdAt, type: "text", get: (x) => x.createdAt, set: (x, v) => ({ ...x, createdAt: String(v) }) },
  { key: "updatedAt", label: ja.propertyPanel.columns.updatedAt, type: "text", get: (x) => x.updatedAt, set: (x, v) => ({ ...x, updatedAt: String(v) }) },
];

const nodeColumns: Column<NodeItem>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "x", label: ja.propertyPanel.columns.x, type: "number", get: (x) => x.x, set: (x, v) => ({ ...x, x: Number(v) }) },
  { key: "y", label: ja.propertyPanel.columns.y, type: "number", get: (x) => x.y, set: (x, v) => ({ ...x, y: Number(v) }) },
  { key: "z", label: ja.propertyPanel.columns.z, type: "number", get: (x) => x.z, set: (x, v) => ({ ...x, z: Number(v) }) },
  { key: "label", label: ja.propertyPanel.columns.displayName, type: "text", get: (x) => x.label ?? "", set: (x, v) => ({ ...x, label: String(v) }) },
];

const memberColumns: Column<Member>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "nodeI", label: ja.propertyPanel.columns.memberNodeI, type: "text", get: (x) => x.nodeI, set: (x, v) => ({ ...x, nodeI: String(v) }) },
  { key: "nodeJ", label: ja.propertyPanel.columns.memberNodeJ, type: "text", get: (x) => x.nodeJ, set: (x, v) => ({ ...x, nodeJ: String(v) }) },
  { key: "materialId", label: ja.propertyPanel.columns.materialId, type: "text", get: (x) => x.materialId, set: (x, v) => ({ ...x, materialId: String(v) }) },
  { key: "sectionId", label: ja.propertyPanel.columns.sectionId, type: "text", get: (x) => x.sectionId, set: (x, v) => ({ ...x, sectionId: String(v) }) },
  { key: "orientationVector", label: ja.propertyPanel.columns.orientationVector, type: "number", help: ja.propertyPanel.help.orientationVector, get: (x) => x.orientationVector?.y ?? 0, set: (x, v) => ({ ...x, orientationVector: { x: x.orientationVector?.x ?? 0, y: Number(v), z: x.orientationVector?.z ?? 1 } }) },
];

const materialColumns: Column<Material>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: ja.propertyPanel.columns.materialName, type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "elasticModulus", label: ja.propertyPanel.columns.elasticModulus, type: "number", help: ja.propertyPanel.help.kNm2, get: (x) => x.elasticModulus, set: (x, v) => ({ ...x, elasticModulus: Number(v) }) },
  { key: "shearModulus", label: ja.propertyPanel.columns.shearModulus, type: "number", help: ja.propertyPanel.help.kNm2, get: (x) => x.shearModulus, set: (x, v) => ({ ...x, shearModulus: Number(v) }) },
  { key: "poissonRatio", label: ja.propertyPanel.columns.poissonRatio, type: "number", get: (x) => x.poissonRatio, set: (x, v) => ({ ...x, poissonRatio: Number(v) }) },
  { key: "density", label: ja.propertyPanel.columns.density, type: "number", get: (x) => x.density, set: (x, v) => ({ ...x, density: Number(v) }) },
];

const sectionColumns: Column<Section>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: ja.propertyPanel.columns.sectionName, type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "area", label: ja.propertyPanel.columns.area, type: "number", help: ja.propertyPanel.help.m2, get: (x) => x.area, set: (x, v) => ({ ...x, area: Number(v) }) },
  { key: "iy", label: ja.propertyPanel.columns.iy, type: "number", help: ja.propertyPanel.help.m4, get: (x) => x.iy, set: (x, v) => ({ ...x, iy: Number(v) }) },
  { key: "iz", label: ja.propertyPanel.columns.iz, type: "number", help: ja.propertyPanel.help.m4, get: (x) => x.iz, set: (x, v) => ({ ...x, iz: Number(v) }) },
  { key: "j", label: ja.propertyPanel.columns.j, type: "number", help: ja.propertyPanel.help.m4, get: (x) => x.j, set: (x, v) => ({ ...x, j: Number(v) }) },
];

const supportColumns: Column<Support>[] = [
  { key: "nodeId", label: ja.propertyPanel.columns.supportNodeId, type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "ux", label: ja.propertyPanel.columns.ux, type: "boolean", get: (x) => x.ux, set: (x, v) => ({ ...x, ux: Boolean(v) }) },
  { key: "uy", label: ja.propertyPanel.columns.uy, type: "boolean", get: (x) => x.uy, set: (x, v) => ({ ...x, uy: Boolean(v) }) },
  { key: "uz", label: ja.propertyPanel.columns.uz, type: "boolean", get: (x) => x.uz, set: (x, v) => ({ ...x, uz: Boolean(v) }) },
  { key: "rx", label: ja.propertyPanel.columns.rx, type: "boolean", get: (x) => x.rx, set: (x, v) => ({ ...x, rx: Boolean(v) }) },
  { key: "ry", label: ja.propertyPanel.columns.ry, type: "boolean", get: (x) => x.ry, set: (x, v) => ({ ...x, ry: Boolean(v) }) },
  { key: "rz", label: ja.propertyPanel.columns.rz, type: "boolean", get: (x) => x.rz, set: (x, v) => ({ ...x, rz: Boolean(v) }) },
];

const loadCaseColumns: Column<LoadCase>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: ja.propertyPanel.columns.loadCaseName, type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "type", label: ja.propertyPanel.columns.loadCaseType, type: "static", get: (x) => x.type, set: (x) => x },
];

const nodalLoadColumns: Column<NodalLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: ja.propertyPanel.columns.loadCaseRefId, type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "nodeId", label: ja.propertyPanel.columns.supportNodeId, type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "fx", label: ja.propertyPanel.columns.nodalFx, type: "number", help: ja.propertyPanel.help.kN, get: (x) => x.fx, set: (x, v) => ({ ...x, fx: Number(v) }) },
  { key: "fy", label: ja.propertyPanel.columns.nodalFy, type: "number", help: ja.propertyPanel.help.kN, get: (x) => x.fy, set: (x, v) => ({ ...x, fy: Number(v) }) },
  { key: "fz", label: ja.propertyPanel.columns.nodalFz, type: "number", help: ja.propertyPanel.help.kN, get: (x) => x.fz, set: (x, v) => ({ ...x, fz: Number(v) }) },
  { key: "mx", label: ja.propertyPanel.columns.nodalMx, type: "number", help: ja.propertyPanel.help.kNm, get: (x) => x.mx, set: (x, v) => ({ ...x, mx: Number(v) }) },
  { key: "my", label: ja.propertyPanel.columns.nodalMy, type: "number", help: ja.propertyPanel.help.kNm, get: (x) => x.my, set: (x, v) => ({ ...x, my: Number(v) }) },
  { key: "mz", label: ja.propertyPanel.columns.nodalMz, type: "number", help: ja.propertyPanel.help.kNm, get: (x) => x.mz, set: (x, v) => ({ ...x, mz: Number(v) }) },
];

const memberLoadColumns: Column<MemberLoad>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "loadCaseId", label: ja.propertyPanel.columns.loadCaseRefId, type: "text", get: (x) => x.loadCaseId, set: (x, v) => ({ ...x, loadCaseId: String(v) }) },
  { key: "memberId", label: ja.propertyPanel.columns.memberName, type: "text", get: (x) => x.memberId, set: (x, v) => ({ ...x, memberId: String(v) }) },
  { key: "coordinateSystem", label: ja.propertyPanel.columns.memberLoadCoordSystem, type: "coord", get: (x) => x.coordinateSystem, set: (x, v) => ({ ...x, coordinateSystem: String(v) === "global" ? "global" : "local" }) },
  { key: "type", label: ja.propertyPanel.columns.loadCaseType, type: "static", get: (x) => x.type, set: (x) => x },
  { key: "wx", label: ja.propertyPanel.columns.memberLoadWx, type: "number", help: ja.propertyPanel.help.kNPerM, get: (x) => x.wx, set: (x, v) => ({ ...x, wx: Number(v) }) },
  { key: "wy", label: ja.propertyPanel.columns.memberLoadWy, type: "number", help: ja.propertyPanel.help.kNPerM, get: (x) => x.wy, set: (x, v) => ({ ...x, wy: Number(v) }) },
  { key: "wz", label: ja.propertyPanel.columns.memberLoadWz, type: "number", help: ja.propertyPanel.help.kNPerM, get: (x) => x.wz, set: (x, v) => ({ ...x, wz: Number(v) }) },
];

const massCaseColumns: Column<NonNullable<ProjectModel["massCases"]>[number]>[] = [
  { key: "id", label: "ID", type: "text", get: (x) => x.id, set: (x, v) => ({ ...x, id: String(v) }) },
  { key: "name", label: ja.propertyPanel.columns.massCaseName, type: "text", get: (x) => x.name, set: (x, v) => ({ ...x, name: String(v) }) },
  { key: "method", label: ja.propertyPanel.columns.massCaseMethod, type: "static", get: (x) => x.method, set: (x) => x },
  { key: "source", label: ja.propertyPanel.columns.massCaseSource, type: "static", get: (x) => x.source, set: (x) => x },
];

const massItemColumns: Column<MassItem>[] = [
  { key: "nodeId", label: ja.propertyPanel.columns.supportNodeId, type: "text", get: (x) => x.nodeId, set: (x, v) => ({ ...x, nodeId: String(v) }) },
  { key: "mx", label: ja.propertyPanel.columns.massItemMx, type: "number", help: ja.propertyPanel.help.massCoef, get: (x) => x.mx, set: (x, v) => ({ ...x, mx: Number(v) }) },
  { key: "my", label: ja.propertyPanel.columns.massItemMy, type: "number", help: ja.propertyPanel.help.massCoef, get: (x) => x.my, set: (x, v) => ({ ...x, my: Number(v) }) },
  { key: "mz", label: ja.propertyPanel.columns.massItemMz, type: "number", help: ja.propertyPanel.help.massCoef, get: (x) => x.mz, set: (x, v) => ({ ...x, mz: Number(v) }) },
  { key: "irx", label: "IRX", type: "number", help: ja.propertyPanel.help.massItemIrZero, get: (x) => x.irx, set: (x, v) => ({ ...x, irx: Number(v) }) },
  { key: "iry", label: "IRY", type: "number", help: ja.propertyPanel.help.massItemIrZero, get: (x) => x.iry, set: (x, v) => ({ ...x, iry: Number(v) }) },
  { key: "irz", label: "IRZ", type: "number", help: ja.propertyPanel.help.massItemIrZero, get: (x) => x.irz, set: (x, v) => ({ ...x, irz: Number(v) }) },
];

const analysisColumns: Column<AnalysisSettings>[] = [
  { key: "analysisType", label: ja.propertyPanel.columns.analysisType, type: "linear_static", get: (x) => x.analysisType, set: (x) => x },
  { key: "includeShearDeformation", label: ja.propertyPanel.columns.includeShearDeformation, type: "boolean", help: ja.propertyPanel.help.shearDeformationLocked, get: (x) => x.includeShearDeformation, set: (x) => x },
  { key: "largeDisplacement", label: ja.propertyPanel.columns.largeDisplacement, type: "boolean", help: ja.propertyPanel.help.shearDeformationLocked, get: (x) => x.largeDisplacement, set: (x) => x },
  { key: "tolerance", label: ja.propertyPanel.columns.tolerance, type: "number", get: (x) => x.tolerance, set: (x, v) => ({ ...x, tolerance: Number(v) }) },
];

const spectrumPointColumns: Column<{ period: number; value: number }>[] = [
  {
    key: "period",
    label: ja.propertyPanel.columns.period,
    type: "number",
    help: ja.propertyPanel.help.period,
    get: (x) => x.period,
    set: (x, v) => ({ ...x, period: Math.max(0, Number(v)) }),
  },
  {
    key: "value",
    label: ja.propertyPanel.columns.spectrumValue,
    type: "number",
    help: ja.propertyPanel.help.spectrumValue,
    get: (x) => x.value,
    set: (x, v) => ({ ...x, value: Math.max(0, Number(v)) }),
  },
];
