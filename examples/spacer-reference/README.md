# SPACER Reference Data Acceptance

## Overview

This directory contains reference data from SPACER for comparison with SPACER Clone results.

## Directory Structure

```
examples/spacer-reference/
├── README.md                    # This file
├── beam/
│   ├── cantilever_tip_load/
│   │   ├── displacement.csv     # Node displacement results
│   │   ├── reaction.csv         # Support reaction results
│   │   ├── member_force.csv     # Member end force results
│   │   └── metadata.json        # Model parameters and notes
│   ├── simple_beam_center/
│   │   └── ...
│   └── simple_beam_uniform/
│       └── ...
├── frame/
│   └── portal_frame/
│       └── ...
└── truss/
    └── simple_truss/
        └── ...
```

## CSV Format

### displacement.csv

```csv
case_id,node_id,ux,uy,uz,rx,ry,rz
LC1,N1,0.0,0.0,0.0,0.0,0.0,0.0
LC1,N2,-1.234e-05,-1.041e-02,0.0,0.0,0.0,-3.902e-03
```

### reaction.csv

```csv
case_id,node_id,fx,fy,fz,mx,my,mz
LC1,N1,0.0,10.0,0.0,0.0,0.0,40.0
```

### member_force.csv

```csv
case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz
LC1,M1,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
LC1,M1,1.0,1.0,0.0,-10.0,0.0,0.0,0.0,-40.0
```

## How to Add SPACER Reference Data

1. Create a directory for the model category and name
2. Export results from SPACER in the formats above
3. Place CSV files in the directory
4. Create a `metadata.json` file with model parameters
5. Run the verification framework to compare results

## metadata.json Format

```json
{
  "name": "Model Name",
  "source": "SPACER v3.2.1",
  "date": "2026-06-20",
  "notes": "Additional notes about the model",
  "parameters": {
    "E": 205000000,
    "I": 0.0001,
    "L": 4.0,
    "P": 10.0
  }
}
```
