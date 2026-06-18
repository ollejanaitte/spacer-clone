import ReactDOM from "react-dom/client";
import { createDefaultProject } from "../../../src/data/defaultProject";
import "../../../src/styles/tokens.css";
import "../../../src/styles.css";
import { TimeHistoryChart } from "../../../src/timeHistory/TimeHistoryChart";
import { TimeHistoryModelAnimation } from "../../../src/timeHistory/TimeHistoryModelAnimation";
import type { TimeHistoryResult } from "../../../src/types";

const project = createDefaultProject();
const time = Array.from({ length: 200 }, (_, index) => index * 0.01);
const result: TimeHistoryResult = {
  meta: {
    analysisId: "e2e-fixture",
    status: "success",
    method: "newmark-beta",
    timeStep: 0.01,
    duration: 1.99,
    sampleCount: time.length,
    groundMotions: [{ direction: "X" }],
  },
  time,
  displacements: {
    G3_ux: time.map((value) => 1.08e-5 * Math.sin(value * Math.PI * 4)),
    G2_ux: time.map((value) => 8e-6 * Math.cos(value * Math.PI * 3)),
  },
  velocities: {
    G3_ux: time.map((value) => 2e-4 * Math.cos(value * Math.PI * 4)),
  },
  accelerations: {
    G2_ux: time.map((value) => 0.95 * Math.sin(value * Math.PI * 2)),
  },
};

function Fixture() {
  return (
    <main style={{ padding: 24, color: "#e5edf8", background: "#0e1726", minHeight: "100vh" }}>
      <TimeHistoryChart result={result} selectedKeys={["G3_ux", "G2_ux"]} />
      <TimeHistoryModelAnimation project={project} result={result} />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Fixture />);
