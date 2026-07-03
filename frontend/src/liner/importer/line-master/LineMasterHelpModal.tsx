import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import {
  LINE_MASTER_HELP_SECTIONS,
  LINE_MASTER_HELP_TITLE,
} from "./lineMasterHelpContent";

type LineMasterHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

function renderSimpleMarkdown(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/g, "<p>")
    .concat("</p>");
}

export function LineMasterHelpModal({ open, onClose }: LineMasterHelpModalProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    LINE_MASTER_HELP_SECTIONS[0]?.id ?? "terms",
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const activeSection =
    LINE_MASTER_HELP_SECTIONS.find((section) => section.id === activeSectionId) ??
    LINE_MASTER_HELP_SECTIONS[0];

  return (
    <div
      className="importer-help-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="line-master-help-backdrop"
    >
      <section
        className="importer-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-master-help-title"
        onClick={(event) => event.stopPropagation()}
        data-testid="line-master-help-modal"
      >
        <header className="importer-help-header">
          <div>
            <span className="importer-help-eyebrow">
              <HelpCircle size={16} aria-hidden="true" />
              わからんヘルプ
            </span>
            <h2 id="line-master-help-title">{LINE_MASTER_HELP_TITLE}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる" data-testid="line-master-help-close">
            <X size={16} />
          </button>
        </header>

        <div className="importer-help-body">
          <nav className="importer-help-tabs" aria-label="ヘルプタブ">
            {LINE_MASTER_HELP_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === activeSectionId ? "is-active" : undefined}
                onClick={() => setActiveSectionId(section.id)}
                data-testid={`line-master-help-tab-${section.id}`}
              >
                {section.title}
              </button>
            ))}
          </nav>
          <article
            className="importer-help-content"
            dangerouslySetInnerHTML={{
              __html: activeSection ? renderSimpleMarkdown(activeSection.body) : "",
            }}
          />
        </div>
      </section>
    </div>
  );
}

export function LineMasterHelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-testid="line-master-help-open">
      <HelpCircle size={16} aria-hidden="true" />
      わからん
    </button>
  );
}
