# X2_INPUT_SPEC — X2正本Input定義

## X2で正本とするEntity

| Entity | 正本Source | Rule Engine Input | Geometry Engine Input | Drawing Input |
|--------|-----------|-------------------|---------------------|--------------|
| STANDARD_RULE | DOC-X0-0145 | YES | NO | NO |
| DESIGN_PARAMETER | X1/X1.5 | YES | YES | NO |
| ALIGNMENT | X1.5 | NO | YES | YES |
| STATION | X1.5 | NO | YES | YES |
| COORDINATE | X1.5 | NO | YES | YES |
| PROFILE | X1.5 | YES | YES | NO |
| CROSSFALL | X1.5 | YES | YES | NO |
| WIDTH | X1 | YES | YES | YES |
| ADOPTED_VALUE | X1.5 | YES | YES | NO |
| APOLLO_CANDIDATE | Apollo P2-II | NO | NO | YES |

## X2で正本とするRelation

| Relation | Engine | 備考 |
|----------|--------|------|
| CONSTRAINS | Rule Engine | 制約値→設計値 |
| CALCULATED_BY | Geometry Engine | 式→計算値 |
| FEEDS | Rule→Geometry | 要求値→幾何計算 |
| ROAD_TO_BRIDGE | Interface | 道路→橋梁伝達 |

## バージョン方針

- Entity定義は X1.8 時点を v1.0 とする
- Rule値の更新は X2 で別途バージョン管理
- Apollo Phase 2-II candidateは read-only 参照のため versioning 対象外
