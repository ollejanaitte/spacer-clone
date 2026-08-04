/**
 * Compact authorization banner: L1 Japanese first, L3 collapsed.
 */
import { getAuthorizationBannerLines, type AuthorizationMessageId } from "../i18n";
import { TechnicalDetails } from "./TechnicalDetails";

export type AuthorizationBannerProps = {
  readonly keys?: readonly (AuthorizationMessageId | string)[];
  readonly testId?: string;
};

const DEFAULT_KEYS: readonly AuthorizationMessageId[] = [
  "UNVERIFIED_DEVELOPMENT_ONLY",
  "NOT_GRANTED",
  "PROHIBITED",
];

export function AuthorizationBanner({
  keys = DEFAULT_KEYS,
  testId = "apollo-authorization-banner",
}: AuthorizationBannerProps) {
  const { l1Lines, l2Lines, technicalLines } = getAuthorizationBannerLines(keys);
  return (
    <aside className="apollo-authorization-banner" data-testid={testId} role="note">
      <p className="apollo-authorization-banner-l1" data-testid={`${testId}-l1`}>
        {l1Lines.join(" — ")}
      </p>
      {l2Lines.length > 0 ? (
        <p className="apollo-authorization-banner-l2" data-testid={`${testId}-l2`}>
          {l2Lines.join(" ")}
        </p>
      ) : null}
      <TechnicalDetails
        testId={`${testId}-tech`}
        lines={technicalLines}
        title="認可"
      />
    </aside>
  );
}
