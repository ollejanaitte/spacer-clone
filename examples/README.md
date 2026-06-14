# Examples

`project.json` is the MVP cantilever-tip-load verification model.

Units follow `docs/04_input_schema.md`:

- Length: m
- Force: kN
- Moment: kN_m
- Modulus: kN_per_m2
- Area: m2
- Inertia: m4

## 動的解析サンプル

`backend/app/main.py` の `/api/examples` には次の10例が登録されています。

| ID | 名称 | 内容 |
| --- | --- | --- |
| cantilever_tip_load | Cantilever Tip Load | 片持ち梁 先端荷重（線形静的） |
| simple_beam_center_load | Simple Beam Center Load | 単純梁 中央集中荷重（線形静的） |
| simple_beam_uniform_load | Simple Beam Uniform Load | 単純梁 等分布荷重（線形静的） |
| cantilever_torsion | Cantilever Torsion | 片持ち梁 先端ねじり（線形静的） |
| cantilever-eigen | Cantilever Eigen Analysis | 片持ち梁 固有値解析 |
| simple-beam-eigen | Simple Beam Eigen Analysis | 単純梁 固有値解析 |
| cantilever-response-spectrum | Cantilever Response Spectrum | 片持ち梁 応答スペクトル解析（SRSS） |
| simple-beam-response-spectrum | Simple Beam Response Spectrum | 単純梁 応答スペクトル解析（SRSS） |
| response-spectrum-cqc | Response Spectrum CQC | 応答スペクトル解析（CQC、片持ち梁） |
| response-spectrum-loglog | Response Spectrum log-log | 応答スペクトル解析（log-log 補間、片持ち梁） |

動的解析用のサンプルJSONファイルは次のとおりです。

- `cantilever_eigen.json` — 片持ち梁 固有値解析
- `simple_beam_eigen.json` — 単純梁 固有値解析
- `cantilever_response_spectrum.json` — 片持ち梁 応答スペクトル解析（SRSS・線形補間）
- `simple_beam_response_spectrum.json` — 単純梁 応答スペクトル解析（SRSS・線形補間）
- `response_spectrum_cqc.json` — 応答スペクトル解析（CQC・線形補間）
- `response_spectrum_loglog.json` — 応答スペクトル解析（SRSS・log-log 補間）

UIの「サンプル」UIから呼び出すか、`/api/examples` のレスポンスで取得できます。サンプルJSONをそのまま `examples/*.json` として開くこともできます。
