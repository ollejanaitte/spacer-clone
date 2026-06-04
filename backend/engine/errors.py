from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AnalysisErrorDetail:
    code: str
    message: str
    path: str | None = None
    entityType: str | None = None
    entityId: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "path": self.path,
            "entityType": self.entityType,
            "entityId": self.entityId,
        }


class AnalysisError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        path: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.detail = AnalysisErrorDetail(
            code=code,
            message=message,
            path=path,
            entityType=entity_type,
            entityId=entity_id,
        )


def error_result(
    project_id: str | None,
    error: AnalysisErrorDetail,
    *,
    node_count: int = 0,
    member_count: int = 0,
    load_case_count: int = 0,
    total_dof: int = 0,
) -> dict[str, Any]:
    return {
        "projectId": project_id or "",
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "linear_static",
            "status": "failed",
            "startedAt": "",
            "finishedAt": "",
            "durationMs": 0.0,
            "nodeCount": node_count,
            "memberCount": member_count,
            "loadCaseCount": load_case_count,
            "totalDof": total_dof,
            "freeDof": 0,
            "constrainedDof": 0,
            "solver": "scipy_sparse",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "warnings": [],
        "errors": [error.to_dict()],
    }
