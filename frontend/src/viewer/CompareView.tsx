import type { ReactNode } from "react";
import { ja } from "../i18n/ja";

/**
 * Display-only side-by-side container for two (or more) viewer instances
 * sharing the same animation clock. The first implementation renders a
 * single column (a single ThreeViewport), but the layout is already laid
 * out as a flex row so adding a second viewer (e.g. for the suspended
 * deck comparison view) is a one-line change.
 *
 * The component does not own any 3D state; the parent (App.tsx) feeds
 * each `slot` with its own <ThreeViewport />. The shared animation clock
 * is provided by the parent so all slots stay in sync.
 */
export type CompareSlot = {
  id: string;
  title: string;
  caption?: string;
  content: ReactNode;
};

export type CompareViewProps = {
  slots: CompareSlot[];
  /** When true, slots are laid out side-by-side; otherwise stacked. */
  sideBySide: boolean;
};

export function CompareView({ slots, sideBySide }: CompareViewProps) {
  if (slots.length === 0) {
    return (
      <div className="compare-view empty" data-testid="compare-view">
        <p>{ja.viewer.messages.compareEmpty}</p>
      </div>
    );
  }
  return (
    <div
      className={sideBySide ? "compare-view side-by-side" : "compare-view stacked"}
      data-testid="compare-view"
      data-mode={sideBySide ? "side-by-side" : "stacked"}
    >
      {slots.map((slot) => (
        <section key={slot.id} className="compare-slot" data-testid={`compare-slot-${slot.id}`}>
          <header className="compare-slot-header">
            <h3>{slot.title}</h3>
            {slot.caption ? <p>{slot.caption}</p> : null}
          </header>
          <div className="compare-slot-body">{slot.content}</div>
        </section>
      ))}
    </div>
  );
}