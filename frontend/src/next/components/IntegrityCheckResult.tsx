import type { IntegrityReport } from "../persistence/package/projectPackageInspector";

export function IntegrityCheckResult({ report }: { report: IntegrityReport }) {
  const rows: ReadonlyArray<{ label: string; status: "ok" | "ng"; value: string }> = [
    { label: "ファイル破損", status: report.fileIntegrity, value: report.fileIntegrity === "ok" ? "OK" : "NG" },
    { label: "Project Schema", status: report.projectSchema, value: report.projectSchema === "ok" ? "OK" : "NG" },
    { label: "必須データ", status: report.requiredData, value: report.requiredData === "ok" ? "OK" : "NG" },
    { label: "checksum", status: report.checksum, value: report.checksum === "ok" ? "OK" : "NG" },
    { label: "容量", status: report.capacity, value: report.capacity === "ok" ? "OK" : "NG" },
  ];

  return (
    <div className="next-integrity" data-testid="integrity-check">
      <h2 className="next-home-section-title">Integrity Check</h2>
      <dl className="next-integrity-meta">
        <div><dt>Packageファイル名</dt><dd data-testid="integrity-file-name">{report.fileName}</dd></div>
        <div><dt>業務名</dt><dd data-testid="integrity-business-name">{report.businessName}</dd></div>
        <div><dt>業務件番</dt><dd data-testid="integrity-business-number">{report.businessNumber}</dd></div>
        <div><dt>Project ID</dt><dd className="next-project-id" data-testid="integrity-project-id">{report.projectId}</dd></div>
        <div><dt>schemaVersion</dt><dd data-testid="integrity-schema-version">{report.schemaVersion}</dd></div>
        <div><dt>Package format version</dt><dd data-testid="integrity-package-version">{report.packageFormatVersion}</dd></div>
        <div><dt>Package容量</dt><dd data-testid="integrity-package-size">{report.packageSizeBytes} bytes</dd></div>
      </dl>

      <table className="next-table" data-testid="integrity-table">
        <thead>
          <tr><th>検査項目</th><th>結果</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} data-testid={`integrity-row-${row.label}`}>
              <td>{row.label}</td>
              <td className={row.status === "ok" ? "next-ok-text" : "next-ng-text"} data-testid={`integrity-${row.label}`}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="next-integrity-verdict" data-testid="integrity-verdict">
        <strong>総合判定: {report.verdict === "loadable" ? "読込可能" : "読込不可"}</strong>
      </div>

      {report.reasons.length > 0 && (
        <ul className="next-integrity-reasons" data-testid="integrity-reasons">
          {report.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
