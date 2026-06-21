import { Component, type ErrorInfo, type ReactNode } from "react";

type Level0ErrorBoundaryProps = {
  children: ReactNode;
  onError: (errorCode: string) => void;
};

type Level0ErrorBoundaryState = {
  hasError: boolean;
};

export class Level0ErrorBoundary extends Component<Level0ErrorBoundaryProps, Level0ErrorBoundaryState> {
  state: Level0ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Level0ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("Level0 error:", error);
    this.props.onError("UNKNOWN_ERROR");
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
