import { Component, type ErrorInfo, type ReactNode } from "react";
import { PageLoadError } from "../components/PageLoadError";

interface RouteErrorBoundaryProps {
  /** The current path: a new one clears the error, so another page can try. */
  resetKey: string;
  reload?: () => void;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  failed: boolean;
  resetKey: string;
}

/**
 * Catches a page that fails to load its code or to render, and shows a way to
 * reload in its place, inside the shell, instead of React unmounting the
 * whole app to a blank screen. A chunk missing after a deploy normally
 * reloads on its own (`lib/chunkReload.ts`); this is for when that is not
 * enough.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    failed: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Partial<RouteErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: RouteErrorBoundaryProps,
    state: RouteErrorBoundaryState,
  ): Partial<RouteErrorBoundaryState> | null {
    return props.resetKey === state.resetKey
      ? null
      : { failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page failed to render", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <PageLoadError
        onReload={this.props.reload ?? (() => window.location.reload())}
      />
    );
  }
}
