# 07 API Specification

## 1. Purpose

This document defines the MVP API contract of the FastAPI backend. It allows the UI owner, the API owner, and the engine owner to implement against the same input / output specification.

## 2. Scope

The MVP API is limited to:

- Health check.
- `project.json` validation.
- Linear static analysis execution.
- Project save.
- Project load.
- Listing sample projects.

## 3. Out of Scope

- User authentication, authorization, license management.
- Cloud persistence, collaborative editing.
- APIs for influence line analysis, moving loads, eigenvalue analysis, and response spectrum analysis.
- DXF output API.
- APIs for integration with external analysis software.

## 4. API Specification

### Common

- Request and response bodies are JSON.
- The character encoding is UTF-8.
- Errors use a structured format that includes `code` and `message`.
- The API does not silently modify the submitted `project`.

### GET /health

Response:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### POST /api/projects/validate

Request:

```json
{
  "project": {}
}
```

Response:

```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

On failure:

```json
{
  "valid": false,
  "warnings": [],
  "errors": [
    {
      "code": "INVALID_REFERENCE",
      "message": "Member M1 references missing node N9.",
      "path": "/members/0/nodeJ",
      "entityType": "member",
      "entityId": "M1"
    }
  ]
}
```

### POST /api/analysis/run

Request:

```json
{
  "project": {},
  "options": {
    "returnCsv": false
  }
}
```

Success response:

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

Analysis failure response:

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
        "code": "MODEL_UNSTABLE",
        "message": "The model has insufficient support constraints."
      }
    ]
  },
  "csv": null
}
```

### POST /api/projects/save

Request:

```json
{
  "fileName": "sample.project.json",
  "project": {}
}
```

Response:

```json
{
  "saved": true,
  "fileName": "sample.project.json"
}
```

### POST /api/projects/load

Request:

```json
{
  "fileName": "sample.project.json"
}
```

Response:

```json
{
  "project": {}
}
```

### GET /api/examples

Response:

```json
{
  "examples": [
    {
      "id": "cantilever_tip_load",
      "name": "Cantilever Tip Load",
      "description": "Fixed-free beam verification model.",
      "project": {}
    }
  ]
}
```

Minimum required examples:

- Cantilever beam with a tip load.
- Simple beam with a center load.
- Simple beam with a uniform load.
- 3D cantilever beam under torsion.

## 5. Error Handling

- JSON parse failure: HTTP 400.
- Schema failure: HTTP 200 with `valid: false`, or HTTP 422. The behavior is unified at implementation time.
- Invalid analysis input: do not run the analysis; return a structured error.
- Path traversal in save / load: HTTP 400.
- Unexpected server exception: HTTP 500.
- HTTP 500 responses must not include the internal stack trace.

## 6. Test Viewpoints

- `GET /health` succeeds.
- A valid `project.json` passes validation.
- Invalid references cause validation to fail.
- A cantilever sample can be analyzed.
- An under-constrained model returns a failure response.
- Save / load rejects `../` paths.
- `GET /api/examples` returns the required examples.

## 7. Definition of Done

- All MVP endpoints are visible in the OpenAPI schema.
- The API tests satisfy `docs/12_quality_gate.md`.
- The API does not contain analysis logic directly; it calls the engine.
- The UI owner can connect to the API using this document alone.
