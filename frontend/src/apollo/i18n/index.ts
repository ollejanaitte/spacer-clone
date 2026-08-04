export { MISSING_LABEL_JA } from "./catalog";
export type {
  AuthorizationMessageId,
  AuthorizationView,
  ButtonActionId,
  DiagnosticView,
  LayeredMessage,
  Locale,
  MemberTypeId,
} from "./types";

export { getStatusLabel, getStatusShortLabel, getStatusMessage } from "./statusLabels";
export { getMemberLabel, getMemberShortLabel } from "./memberLabels";
export {
  getWorkflowStepLabel,
  getWorkflowStepDescription,
  getWorkflowStepShortLabel,
  getWorkflowGroupLabel,
} from "./workflowLabels";
export { getButtonLabel, getButtonShortLabel } from "./buttonLabels";
export { getFieldLabel, getPresenceLabel, getViewerControlLabel } from "./fieldLabels";
export { getDiagnosticMessage } from "./diagnosticMessages";
export { getAuthorizationMessage, getAuthorizationBannerLines } from "./authorizationMessages";
export { getTechnicalLabel, formatTechnicalPair } from "./technicalLabels";

export {
  STATUS_CATALOG,
  MEMBER_CATALOG,
  WORKFLOW_STEP_CATALOG,
  WORKFLOW_GROUP_CATALOG,
  BUTTON_CATALOG,
  FIELD_CATALOG,
  AUTHORIZATION_CATALOG,
  DIAGNOSTIC_CATALOG,
} from "./catalog";
