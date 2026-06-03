# API Specification

## Purpose

The FastAPI backend exposes validation, analysis, persistence, and example project operations for the MVP.

## General Rules

- Request and response bodies use JSON.
- API must be stateless except explicit save/load operations.
- Analysis must not mutate submitted project JSON.
- Validation errors must use structured error objects.
- All endpoints return UTF-8 JSON.

## GET /health

Returns service health.

Response `200`:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## POST /api/projects/validate

Validates `project.json` without running analysis.

Request:

```json
{
  "project": {}
}
```

The `project` value is the full `project.json` object defined in `docs/04_input_schema.md`.

Response `200`:

```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

Response with validation failure:

```json
{
  "valid": false,
  "warnings": [],
  "errors": [
    {
      "code": "INVALID_REFERENCE",
      "message": "Member M1 references missing node N99.",
      "path": "/members/0/nodeJ",
      "entityType": "member",
      "entityId": "M1"
    }
  ]
}
```

## POST /api/analysis/run

Runs linear static analysis.

Request:

```json
{
  "project": {},
  "options": {
    "returnCsv": false
  }
}
```

Response `200` success:

```json
{
  "result": {
    "analysisSummary": {
      "status": "success"
    },
    "displacements": [],
    "reactions": [],
    "memberEndForces": [],
    "warnings": [],
    "errors": []
  },
  "csv": null
}
```

If `returnCsv` is true, `csv` may contain:

```json
{
  "displacements": "loadCaseId,nodeId,ux,uy,uz,rx,ry,rz\n",
  "reactions": "loadCaseId,nodeId,fx,fy,fz,mx,my,mz,constrainedDofs\n",
  "memberEndForces": "loadCaseId,memberId,end,fx,fy,fz,mx,my,mz\n"
}
```

Response `200` analysis failed:

```json
{
  "result": {
    "analysisSummary": {
      "status": "failed"
    },
    "displacements": [],
    "reactions": [],
    "memberEndForces": [],
    "warnings": [],
    "errors": [
      {
        "code": "SOLVER_ERROR",
        "message": "Global stiffness matrix is singular."
      }
    ]
  },
  "csv": null
}
```

Unexpected server errors use `500`.

## POST /api/projects/save

Saves a project JSON payload.

MVP persistence may be local filesystem storage under a configured workspace path.

Request:

```json
{
  "project": {},
  "fileName": "example.project.json"
}
```

Response `200`:

```json
{
  "saved": true,
  "fileName": "example.project.json"
}
```

Rules:

- File names must be sanitized.
- Directory traversal is forbidden.
- Project must validate before save unless `allowInvalid` is explicitly added in a later phase.

## POST /api/projects/load

Loads a saved project.

Request:

```json
{
  "fileName": "example.project.json"
}
```

Response `200`:

```json
{
  "project": {}
}
```

Rules:

- Directory traversal is forbidden.
- Loaded content must be parsed as JSON.
- Invalid saved projects return validation errors.

## GET /api/examples

Returns bundled examples.

Response `200`:

```json
{
  "examples": [
    {
      "id": "cantilever_tip_load",
      "name": "Cantilever Tip Load",
      "description": "Verification model for a fixed-free beam.",
      "project": {}
    }
  ]
}
```

Minimum examples:

- Cantilever tip load.
- Simply supported center point load.
- Simply supported uniform load.
- 3D cantilever torsion.

## API Testing Requirements

- Every endpoint has success and failure tests.
- `/api/analysis/run` tests include at least one known result case.
- Save/load tests must verify path traversal rejection.
- Error response shape must be stable.
