import type { ReactNode } from "react";
import { ja } from "../../i18n/ja";
import {
  LINER_SETUP_TAB_IDS,
  type LinerSetupTabId,
} from "../uiPreparation";

export type LinerSetupTabsProps = {
  activeTab: LinerSetupTabId;
  onTabChange: (tabId: LinerSetupTabId) => void;
  children: ReactNode;
};

function tabPanelId(tabId: LinerSetupTabId): string {
  return `liner-setup-tabpanel-${tabId}`;
}

function tabButtonId(tabId: LinerSetupTabId): string {
  return `liner-setup-tab-${tabId}`;
}

export function LinerSetupTabs({ activeTab, onTabChange, children }: LinerSetupTabsProps) {
  return (
    <section className="liner-setup-tabs" data-testid="liner-setup-tabs">
      <div className="liner-setup-tabs-list" role="tablist" aria-label={ja.liner.setupTabs.tablistLabel}>
        {LINER_SETUP_TAB_IDS.map((tabId) => {
          const selected = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              id={tabButtonId(tabId)}
              className={selected ? "liner-setup-tab active" : "liner-setup-tab"}
              aria-selected={selected}
              aria-controls={tabPanelId(tabId)}
              data-testid={`liner-setup-tab-${tabId}`}
              onClick={() => onTabChange(tabId)}
            >
              {ja.liner.setupTabs[tabId]}
            </button>
          );
        })}
      </div>
      <div
        className="liner-setup-tab-body"
        role="tabpanel"
        id={tabPanelId(activeTab)}
        aria-labelledby={tabButtonId(activeTab)}
        data-testid={`liner-setup-tabpanel-${activeTab}`}
      >
        {children}
      </div>
    </section>
  );
}
