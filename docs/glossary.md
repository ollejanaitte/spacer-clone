# Glossary

This glossary maps the Japanese domain terms used in this project to the English terms used in source code, internal documentation, and API field names. UI strings rendered to the user remain in Japanese and live in `frontend/src/i18n/ja.ts`.

## Structural terms

| Japanese | English (canonical) | Notes |
| --- | --- | --- |
| 節点 | node | A point in 3D space where members meet. |
| 部材 | member | A 1D frame element between two nodes. |
| 支点 | support | A boundary condition applied to a node. |
| 支点条件 | support condition | The boolean flags `ux/uy/uz/rx/ry/rz` on a support. |
| 橋軸方向 | longitudinal direction | Direction along the bridge axis. |
| 横断方向 | transverse direction | Direction across the bridge deck. |
| 床版 | deck / deck slab | Surface on which traffic loads are applied. |
| 主桁 | main girder | Primary longitudinal beam supporting the deck. |
| 横桁 | cross beam | Transverse beam connecting main girders. |

## Loads and analysis

| Japanese | English (canonical) | Notes |
| --- | --- | --- |
| 荷重 | load | Generic load term. |
| 荷重ケース | load case | A named group of nodal/member loads. |
| 固定荷重 | static load / fixed load | Permanent load (e.g. self-weight). |
| 死荷重 | dead load | Permanent non-structural load. |
| 活荷重 | live load | Variable traffic load. |
| 衝撃係数 | impact factor | Multiplier applied to live load for dynamic effect. |
| 走行荷重 | moving load / traffic load | Load pattern that moves along a line. |
| 分布荷重 | distributed load | Load applied uniformly along a member. |
| 車両荷重 | vehicle load | Concentrated moving load representing a vehicle. |
| 質量 | mass | Lumped mass for eigenvalue analysis. |
| 質量ケース | mass case | A named group of mass items. |
| 影響線 | influence line | Influence line for a member section force. |
| 影響線解析 | influence line analysis | Analysis that produces influence line data. |
| 固有値解析 | eigenvalue analysis | Modal analysis producing natural frequencies/modes. |
| 応答スペクトル解析 | response spectrum analysis | Seismic analysis using a response spectrum. |
| 応答スペクトル | response spectrum | Spectrum used by response spectrum analysis. |
| モード | mode | Eigen mode (mode shape, period, etc.). |
| モード合成 | modal combination | SRSS / CQC combination of modal responses. |
| 累積有効質量比 | cumulative effective mass ratio | Sum of effective mass ratios across selected modes. |
| 刺激係数 | modal participation factor | Mode participation factor. |
| 減衰定数 | damping ratio | Fraction of critical damping. |
| 補間 | interpolation | Log-log or linear interpolation of spectrum points. |

| 時系列応答解析 | time history analysis | Direct-integration dynamic analysis that produces time-domain response. |
| 直接時間積分 | direct integration | Time-stepping method that solves the equation of motion step by step. |
| Newmark-β法 | Newmark-beta method | Implicit time-stepping integration. Average acceleration variant uses beta=1/4, gamma=1/2. |
| 初期値問題 | initial value problem | Time history problem defined by u(t0), u_dot(t0), u_ddot(t0). |
| 時間刻み | time step | Integration step `dt` for direct time integration. |
| レイリー減衰 | Rayleigh damping | Damping model C = alpha * M + beta * K. |
| 地動加速度 | ground acceleration | Time-varying base acceleration input for seismic analysis. |
| 地震波 | ground motion | Time history record of ground acceleration. |
| 工学的基盤 | engineering bedrock | Reference level where the ground motion is input. |
| 絶対加速度応答 | absolute acceleration response | Total acceleration of a node, including base motion. |
| 相対変位応答 | relative displacement response | Displacement of a node relative to the base. |
| 履歴 | history / time history | Time-domain sequence of a response quantity. |
| 包絡値 | envelope value | Maximum or minimum of a quantity over the analysis duration. |
| 対数減衰率 | logarithmic decrement | Ratio of successive peak amplitudes in damped free vibration, delta = (2 * pi * xi) / sqrt(1 - xi^2). |
| 動的増幅率 | dynamic amplification factor | Steady-state amplitude ratio of a damped SDOF under harmonic excitation, H(beta) = 1 / sqrt((1 - beta^2)^2 + (2 * xi * beta)^2). |
| 擬似加速度 | pseudo acceleration | Spectral response quantity defined as omega_n^2 * u_rel; basis of response spectra. |
| 減衰固有周期 | damped natural period | T_d = 2 * pi / (omega_n * sqrt(1 - xi^2)) for underdamped SDOF. |
| ゼロクロス | zero crossing | Time at which a response history crosses zero; used to measure natural period. |
| エネルギー漂流 | energy drift | Cumulative change in total mechanical energy caused by numerical integration error. |
| 直接積分法の安定性 | stability of direct integration | Property of the time-stepping method with respect to numerical error growth. |
| エネルギー釣合 | energy balance | Sum of kinetic, potential, and dissipated energy compared with input energy. |

## Results and reporting

| Japanese | English (canonical) | Notes |
| --- | --- | --- |
| 変位 | displacement | Nodal displacement (translation/rotation). |
| 反力 | reaction | Reaction force/moment at a support. |
| 断面力 | member force / section force | Internal force in a member (axial, shear, moment). |
| 部材力 | member force | Internal force result for a member. |
| 帳票 | report | PDF/HTML/CSV/JSON output. |
| 結果 | result / results | Generic term for analysis output. |
| ステーション | station | Cross-section position along a member. |

## Geometry and views

| Japanese | English (canonical) | Notes |
| --- | --- | --- |
| 座標系 | coordinate system | Global or local axes. |
| 全体座標系 | global coordinate system | The default XYZ frame. |
| 部材座標系 | member coordinate system | The local frame attached to a member. |
| 局部座標系 | local coordinate system | Same as member coordinate system. |
| 支間 | span | A single span of the bridge. |
| 径間 | span | Synonym for 支間. |
| 橋脚 / 橋台 | pier / abutment | A substructure node in the bridge. |
| 描画 | rendering / drawing | Display of geometry in the 3D viewport. |

## UI terms (kept Japanese in `ja.ts`)

The following terms appear as Japanese strings in the UI. They are stored verbatim in `frontend/src/i18n/ja.ts` and imported where they are rendered. Code identifiers that reference them use the English equivalents in the glossary above.

- 節点, 部材, 支点, 支点条件, 荷重, 荷重ケース, 固定荷重, 活荷重, 断面力, 変位, 反力
- 固有値解析, 応答スペクトル解析, 座標系, 影響線, 帳票
- 橋梁モデル作成, 静的解析, 入力チェック, 開く, 保存, 新規, JSON, CSV, PDF帳票, 出力, エラー, 警告, ログ
