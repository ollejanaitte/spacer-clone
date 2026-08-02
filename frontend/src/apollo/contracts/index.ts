export {
  BridgeSystem,
  CONTINUOUS_SPAN_COUNT_MAX,
  CONTINUOUS_SPAN_COUNT_MIN,
  SupportLayoutRole,
  type BridgeLayoutContract,
  type BridgeLayoutSpan,
  type BridgeLayoutSupport,
} from "./layoutTypes";
export {
  parseBridgeLayoutSpans,
  parseBridgeLayoutSupports,
  parseBridgeSystemField,
} from "./layoutParser";
export {
  buildContinuousLayout,
  buildSimpleSingleLayout,
  buildSupportsFromSpans,
  LAYOUT_STATION_TOLERANCE,
  resolveBridgeSystem,
  resolveEffectiveLayout,
  sumSpanLengths,
  validateBridgeLayoutContract,
} from "./layoutValidation";
