import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; onError: (errorCode: string) => void };
type State = { hasError: boolean };

export class Level0ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, _info: ErrorInfo) { console.error("Level0 error:", error); this.props.onError("UNKNOWN_ERROR"); }
  render() { return this.state.hasError ? null : this.props.children; }
}
