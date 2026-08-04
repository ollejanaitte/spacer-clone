/**
 * Apollo Step 5-JP2 Japanese UI catalog types.
 * Internal enums / schema keys remain English; L1/L2 are Japanese.
 */

export type Locale = "ja";

export type LayeredMessage = {
  readonly l1: string;
  readonly l2?: string;
  readonly nextAction?: string;
  readonly technical?: {
    readonly enum?: string;
    readonly code?: string;
    readonly path?: string;
    readonly extra?: string;
  };
};

export type AuthorizationView = LayeredMessage;

export type DiagnosticView = LayeredMessage;

export type MemberTypeId =
  | "MAIN_GIRDER"
  | "CROSS_BEAM"
  | "CROSS_FRAME"
  | "SWAY_BRACING"
  | "UPPER_LATERAL_BRACING"
  | "LOWER_LATERAL_BRACING"
  | "RC_DECK"
  | "HAUNCH"
  | "CURB"
  | "WALL_RAILING"
  | "MEDIAN"
  | "OPTIONAL_BARRIER"
  | "PAVEMENT"
  | "ROAD_MARKING"
  | "SUPPORT"
  | "L_SECTION"
  | "LEFT_CURB"
  | "RIGHT_CURB"
  | (string & {});

export type ButtonActionId =
  | "APPLY_SAMPLE"
  | "APPLY_GENERATE"
  | "SAVE_NEXT"
  | "OPEN_DETAIL"
  | "REGENERATE"
  | "CREATE_NEW"
  | "REPLACE"
  | "CANCEL"
  | "SHOW_TECH"
  | "EXPORT_STL"
  | "Apply Sample"
  | "Apply & Generate"
  | "Save and Next"
  | "Open Detail"
  | "Regenerate"
  | "Create New"
  | "Replace Current"
  | "Cancel"
  | "Show Technical Details"
  | "Export STL"
  | (string & {});

export type AuthorizationMessageId =
  | "NOT_GRANTED"
  | "PROHIBITED"
  | "UNVERIFIED_DEVELOPMENT_ONLY"
  | "PENDING_HUMAN_ENGINEERING_REVIEW"
  | "NOT_FOR_DESIGN_OR_CONSTRUCTION"
  | "USER_REVIEW_REQUIRED"
  | "NOT_FOR_ESTIMATE"
  | "NO_GO_PENDING_HUMAN_VALIDATION"
  | "STRUCTURAL_ENGINEERING_CORRECTNESS"
  | (string & {});
