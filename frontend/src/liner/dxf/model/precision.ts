export type DxfPrecisionPolicy = {
  coordinateDecimals: number;
  angleDecimals: number;
  textHeightDecimals: number;
};

export const DEFAULT_DXF_PRECISION_POLICY: DxfPrecisionPolicy = {
  coordinateDecimals: 6,
  angleDecimals: 6,
  textHeightDecimals: 3,
};

export function resolveDxfPrecisionPolicy(
  partial?: Partial<DxfPrecisionPolicy>,
): DxfPrecisionPolicy {
  return {
    coordinateDecimals: partial?.coordinateDecimals ?? DEFAULT_DXF_PRECISION_POLICY.coordinateDecimals,
    angleDecimals: partial?.angleDecimals ?? DEFAULT_DXF_PRECISION_POLICY.angleDecimals,
    textHeightDecimals: partial?.textHeightDecimals ?? DEFAULT_DXF_PRECISION_POLICY.textHeightDecimals,
  };
}
